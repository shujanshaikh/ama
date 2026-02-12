# Desktop App Rewrite: Electron + Vite + React (Self-Contained)

## Context

The current desktop app is a thin Electron shell loading the web app URL. The user wants a **fully self-contained** desktop app that:

1. Has its own React UI (dashboard + agent/chat pages)
2. **Does NOT require the CLI daemon** - the Electron main process IS the daemon
3. Discovers projects from IDEs (VS Code, Cursor, WebStorm, Zed) + native folder picker
4. Auto-creates projects on the server when selected
5. Authenticates via browser redirect (deep link `ama://` callback)
6. Runs agent on the server, but tool execution happens locally in Electron main process
7. No editor or preview URL panels - just dashboard + chat

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Desktop App (Electron)                                  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Main Process (Node.js)                              ││
│  │  - WebSocket → /agent-streams (acts as daemon)      ││
│  │  - Tool execution (readFile, editFile, grep, etc.)  ││
│  │  - Snapshot system (git-based undo)                 ││
│  │  - Project registry & discovery                     ││
│  │  - Auth (deep link protocol handler)                ││
│  │  - IPC handlers for renderer                        ││
│  └──────────────┬──────────────────────────────────────┘│
│                 │ IPC                                    │
│  ┌──────────────┴──────────────────────────────────────┐│
│  │ Renderer (Vite + React)                             ││
│  │  - Dashboard page (projects, discovery)             ││
│  │  - Chat page (messages, prompt, streaming)          ││
│  │  - HTTP → Server (tRPC for CRUD)                    ││
│  │  - HTTP SSE → Server (/agent-proxy for streaming)   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                          │
              HTTP/WS     │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Server (existing Hono app - minimal changes)            │
│  - tRPC: project, chat, apiKeys, generateTitle           │
│  - POST /agent-proxy → streamText → tool_call → daemon   │
│  - WS /agent-streams → tool calls to Electron main       │
│  - NEW: /api/auth/desktop-callback → deep link redirect   │
└─────────────────────────────────────────────────────────┘
```

## Implementation Steps

---

### Step 1: Project Scaffold (Electron + Vite + React)

**Modify:** `apps/desktop/package.json`
- Add: `@electron-forge/plugin-vite`, `react`, `react-dom`, `react-router-dom`
- Add: `@tanstack/react-query`, `@trpc/client`, `@trpc/tanstack-react-query`
- Add: `@ai-sdk/react`, `ai` (chat streaming)
- Add: `tailwindcss`, `@tailwindcss/vite`, `postcss`, `autoprefixer`
- Add: `lucide-react`, `framer-motion`, `clsx`, `tailwind-merge`
- Add: `electron-store`, `fast-glob`, `@anthropic-ai/sdk` (not needed, tools are custom)
- Keep: `electron`, `@electron-forge/cli`, makers

**Modify:** `apps/desktop/forge.config.ts`
- Replace direct packager config with `@electron-forge/plugin-vite`
- Configure main, preload, renderer Vite entry points

**Create:** `apps/desktop/vite.main.config.ts` - Main process Vite config
**Create:** `apps/desktop/vite.preload.config.ts` - Preload Vite config
**Create:** `apps/desktop/vite.renderer.config.ts` - Renderer Vite config (React + Tailwind)
**Create:** `apps/desktop/index.html` - HTML entry for renderer
**Create:** `apps/desktop/postcss.config.js`
**Create:** `apps/desktop/tailwind.config.ts`
**Modify:** `apps/desktop/tsconfig.json` - Add path aliases, JSX support

---

### Step 2: Electron Main Process - Core

**Restructure** `apps/desktop/src/` into `src/main/` and `src/renderer/`:

**Create:** `apps/desktop/src/main/main.ts`
- Create BrowserWindow loading Vite dev server (dev) or built HTML (prod)
- Register `ama://` custom protocol via `app.setAsDefaultProtocolClient('ama')`
- Handle `open-url` event (macOS) for deep link auth callback
- Initialize daemon connection (WebSocket to `/agent-streams`)
- Setup IPC handlers
- Window state persistence (reuse existing logic)

**Create:** `apps/desktop/src/main/preload.ts`
- Expose via contextBridge:
  ```ts
  window.electronAPI = {
    auth: {
      signIn: () => ipcRenderer.invoke('auth:sign-in'),
      signOut: () => ipcRenderer.invoke('auth:sign-out'),
      getSession: () => ipcRenderer.invoke('auth:get-session'),
      onAuthStateChange: (cb) => ipcRenderer.on('auth:state-changed', cb),
    },
    projects: {
      discover: () => ipcRenderer.invoke('projects:discover'),
      selectFolder: () => ipcRenderer.invoke('projects:select-folder'),
      getContext: (cwd) => ipcRenderer.invoke('projects:get-context', cwd),
    },
    daemon: {
      getStatus: () => ipcRenderer.invoke('daemon:status'),
      onStatusChange: (cb) => ipcRenderer.on('daemon:status-changed', cb),
    },
    platform: process.platform,
  }
  ```

**Create:** `apps/desktop/src/main/constants.ts`
- DEV_URL / PRODUCTION_URL for web app
- DEV_SERVER_URL / PRODUCTION_SERVER_URL for API server
- DEV_WS_URL / PRODUCTION_WS_URL for WebSocket

---

### Step 3: Embedded Daemon (Main Process)

This is the core differentiator - the Electron main process acts as the CLI daemon.

**Create:** `apps/desktop/src/main/daemon/connection.ts`
- Connect to server's `/agent-streams` WebSocket
- Send auth token in headers
- Handle reconnection with exponential backoff (reuse pattern from `packages/ama-agent/src/server.ts`)
- Listen for `tool_call` and `rpc_call` messages
- Dispatch to appropriate handlers
- Send `tool_result` responses back

**Create:** `apps/desktop/src/main/daemon/tool-executor.ts`
- Registry mapping tool names to executor functions:
  ```ts
  const toolExecutors = {
    readFile: executeReadFile,
    editFile: executeEditFile,
    stringReplace: executeStringReplace,
    deleteFile: executeDeleteFile,
    grep: executeGrep,
    glob: executeGlob,
    listDirectory: executeListDirectory,
    runTerminalCommand: executeRunTerminalCommand,
    batch: executeBatch,
  }
  ```
- Each executor adapted from `packages/ama-agent/src/tools/`

**Create:** `apps/desktop/src/main/daemon/tools/`
- `read-file.ts` - Adapted from `packages/ama-agent/src/tools/read-file.ts`
  - `fs.readFile` with line range support, path validation
- `edit-file.ts` - Adapted from `packages/ama-agent/src/tools/edit-file.ts`
  - Create/overwrite files, line diff tracking
- `string-replace.ts` - Adapted from `packages/ama-agent/src/tools/apply-patch.ts`
  - Find and replace text in files
- `delete-file.ts` - `fs.unlink` with path validation
- `grep.ts` - Adapted from `packages/ama-agent/src/tools/grep.ts`
  - Regex search across files (spawn `grep` or use ripgrep if available)
- `glob.ts` - Adapted from `packages/ama-agent/src/tools/glob.ts`
  - Use `fast-glob` to find files by pattern
- `list-directory.ts` - `fs.readdir` with formatting
- `run-terminal-command.ts` - Adapted from `packages/ama-agent/src/tools/runTerminalCommand.ts`
  - `child_process.exec` with timeout, safety checks for dangerous commands
- `batch.ts` - Execute multiple tools in parallel

**Create:** `apps/desktop/src/main/daemon/sandbox.ts`
- Path validation (adapted from `packages/ama-agent/src/lib/sandbox.ts`)
- Ensure all file operations stay within project directory
- Reject path traversal attempts

**Create:** `apps/desktop/src/main/daemon/snapshot.ts`
- Snapshot system adapted from `packages/ama-agent/src/snapshot/snapshot.ts`
- Git-based file state tracking using bare repos in `~/.ama-desktop/snapshots/`
- `track(projectId)` → create snapshot hash
- `restore(projectId, hash)` → restore files to snapshot state
- `diff(projectId, hash)` → get changed files

**Create:** `apps/desktop/src/main/daemon/project-registry.ts`
- In-memory + persisted registry (adapted from `packages/ama-agent/src/lib/project-registry.ts`)
- Store in `~/.ama-desktop/projects.json`
- `register(projectId, cwd, name)`, `unregister(projectId)`, `list()`, `getProject(id)`

**Create:** `apps/desktop/src/main/daemon/rpc-handlers.ts`
- Handle RPC calls from server:
  - `daemon:register_project` → project registry
  - `daemon:snapshot_track` → snapshot.track()
  - `daemon:snapshot_restore` → snapshot.restore()
  - `daemon:snapshot_patch` → snapshot.diff()
  - `daemon:get_context` → list project files (excluding node_modules, .git, etc.)
  - `daemon:get_workspace_folders` → project registry list
  - `daemon:status` → connection status

**Create:** `apps/desktop/src/main/daemon/get-files.ts`
- List files in a project directory for context selector
- Exclude: `node_modules`, `.git`, `dist`, `build`, `.next`, etc.
- Adapted from `packages/ama-agent/src/lib/get-files.ts`

---

### Step 4: Auth System

**Create:** `apps/desktop/src/main/auth.ts`
- `signIn()`:
  1. Generate WorkOS auth URL (use `@workos-inc/node` SDK or construct URL manually)
  2. Set redirect URI to `https://ama.shujan.xyz/api/auth/desktop-callback`
  3. Include state: `{ desktop: true, returnTo: 'ama://auth/callback' }`
  4. Open URL in default browser via `shell.openExternal(url)`
- Protocol handler (`ama://auth/callback?data=<base64>`):
  1. Decode base64 data → `{ accessToken, refreshToken, user }`
  2. Store in electron-store
  3. Call existing `/api/auth/desktop` endpoint with tokens → get Set-Cookie
  4. Set cookie in `session.defaultSession.cookies`
  5. Reconnect daemon WebSocket with new auth
  6. Notify renderer via IPC `auth:state-changed`
- `signOut()`: Clear stored tokens, clear cookies, disconnect daemon
- `getSession()`: Return stored user info

**Create:** `apps/web/src/routes/api/auth/desktop-callback.tsx` (NEW web endpoint)
- Same OAuth code exchange as existing callback
- Detect desktop flow via state parameter `{ desktop: true }`
- Instead of redirecting to `/dashboard`, redirect to:
  `ama://auth/callback?data=<base64url({ accessToken, refreshToken, user })>`

---

### Step 5: Project Discovery

**Create:** `apps/desktop/src/main/project-discovery.ts`
- Scan all IDEs for recent projects:
  - **VS Code**: `~/Library/Application Support/Code/User/globalStorage/storage.json` → parse `openedPathsList.entries`
  - **Cursor**: `~/Library/Application Support/Cursor/User/globalStorage/storage.json` → same format
  - **WebStorm**: `~/Library/Application Support/JetBrains/WebStorm*/options/recentProjects.xml` → parse XML for `<entry key="/path">` elements
  - **Zed**: `~/Library/Application Support/Zed/db/` → look for workspace data
- Deduplicate paths, verify folders exist with `fs.existsSync`
- Return `{ name, path, ide: 'vscode' | 'cursor' | 'webstorm' | 'zed' }[]`
- `selectFolder()`: Use `dialog.showOpenDialog({ properties: ['openDirectory'] })`

**Create:** `apps/desktop/src/main/ipc-handlers.ts`
- Register all IPC handlers:
  - `auth:sign-in`, `auth:sign-out`, `auth:get-session`
  - `projects:discover`, `projects:select-folder`, `projects:get-context`
  - `daemon:status`

---

### Step 6: React Renderer - Base Setup

**Create:** `apps/desktop/src/renderer/index.tsx` - React entry point
**Create:** `apps/desktop/src/renderer/index.css` - Tailwind imports + dark theme base

**Create:** `apps/desktop/src/renderer/App.tsx`
```tsx
<QueryClientProvider client={queryClient}>
  <TRPCProvider client={trpcClient} queryClient={queryClient}>
    <RouterProvider router={router} />
  </TRPCProvider>
</QueryClientProvider>
```

**Create:** `apps/desktop/src/renderer/router.tsx`
- `/login` → Login page
- `/dashboard` → Dashboard (protected)
- `/chat/:projectId` → Chat page (protected, `?chat=<chatId>` param)
- Root `/` redirects based on auth state

**Create:** `apps/desktop/src/renderer/lib/trpc.ts`
- tRPC client with httpBatchLink
- Points to web app's tRPC endpoint (credentials: 'include' for cookies)
- Import `AppRouter` type from web app

**Create:** `apps/desktop/src/renderer/lib/constants.ts`
- API_URL, WS_URL, WEB_URL (dev/prod)

**Create:** `apps/desktop/src/renderer/lib/utils.ts`
- `cn()` utility (clsx + tailwind-merge)

**Create:** `apps/desktop/src/renderer/hooks/use-auth.ts`
- Calls `window.electronAPI.auth.getSession()` on mount
- Listens for `auth:state-changed` events
- Provides `{ user, isAuthenticated, isLoading, signIn, signOut }`

---

### Step 7: UI Components (Copy from Web App)

Copy and minimally adapt these from `apps/web/src/components/`:

**UI primitives** → `apps/desktop/src/renderer/components/ui/`
- `button.tsx`, `dialog.tsx`, `input.tsx`, `select.tsx`, `skeleton.tsx`
- `scroll-area.tsx`, `sidebar.tsx`, `resizable.tsx`

**AI elements** → `apps/desktop/src/renderer/components/ai-elements/`
- `message.tsx`, `conversation.tsx`, `response.tsx`, `reasoning.tsx`
- `sources.tsx`, `prompt-input.tsx`, `code-block.tsx`, `text-parts.tsx`
- `loading-dots.tsx`, `tool.tsx`, `loader.tsx`, `shimmer.tsx`

**Chat components** → `apps/desktop/src/renderer/components/chat/`
- `chat-message-list.tsx`, `chat-prompt-input.tsx`
- `chat-status-bar.tsx`, `chat-error-alert.tsx`

**Other** → `apps/desktop/src/renderer/components/`
- `tool-render.tsx`, `context-selector.tsx`, `api-key-dialog.tsx`
- `ama-logo.tsx`, `file-icons.tsx`

**Adaptation needed:**
- Replace `@tanstack/react-router` navigation with `react-router-dom`
- Replace `useTRPC()` imports to use desktop's trpc setup
- Replace `useUserStreamContextOptional()` with IPC-based alternatives
- Replace `import.meta.env` references with desktop constants

---

### Step 8: Dashboard Page

**Create:** `apps/desktop/src/renderer/pages/dashboard.tsx`

Adapted from `apps/web/src/routes/_authenticated/dashboard.tsx`:
- Welcome message with user's name
- **Project list** from tRPC `getProjects` (same as web)
- **Search** and **grid layout** with color-coded avatars (same as web)
- **Import Project dialog** (manual path input - same as web)
- **NEW: Discovered Projects section** (replaces CLI-based IdeProjects)
  - Calls `window.electronAPI.projects.discover()` via IPC
  - Shows projects from VS Code, Cursor, WebStorm, Zed
  - Shows IDE icon/badge for each project
  - "Open Folder" button → `window.electronAPI.projects.selectFolder()` → native dialog
- On project click → create project via tRPC if needed → navigate to `/chat/:projectId`
- On discovered project click → auto-create via tRPC `createProject` → navigate

---

### Step 9: Chat/Agent Page

**Create:** `apps/desktop/src/renderer/pages/chat.tsx`

Adapted from `apps/web/src/routes/_authenticated/chat.$projectId.tsx`:
- **REMOVE:** CodeEditor, PreviewIframe, DiffReviewPanel, ResizablePanelGroup right panel
- **KEEP:** Full-width chat layout with sidebar
- **KEEP:** `useChat` with `DefaultChatTransport` → `POST ${API_URL}/agent-proxy`
- **KEEP:** Gateway token management (BYOK)
- **KEEP:** Model selector, Agent/Plan mode toggle
- **KEEP:** Context file selector (uses IPC `projects:get-context` instead of CLI RPC)
- **KEEP:** Undo/Accept via tRPC + IPC to main process snapshot restore
- **KEEP:** Auto title generation
- **KEEP:** Auto-resume for interrupted streams

Key difference from web: Context selector and undo go through Electron IPC to main process instead of WebSocket RPC through the CLI daemon.

---

### Step 10: Side Panel

**Create:** `apps/desktop/src/renderer/components/side-panel.tsx`

Adapted from `apps/web/src/components/side-panel.tsx`:
- React Router navigation instead of TanStack Router
- Chat list with search, recent/older grouping
- New chat button
- Back to Dashboard link
- Project name display

---

### Step 11: Login Page

**Create:** `apps/desktop/src/renderer/pages/login.tsx`

Simple page:
- AMA logo + branding
- "Sign in with Browser" button → calls `window.electronAPI.auth.signIn()`
- Loading state while waiting for deep link callback
- Auto-redirect to `/dashboard` on auth completion

---

### Step 12: Menu & Window Management

**Create:** `apps/desktop/src/main/menu.ts`
- Adapted from existing - adjust navigation to work with React Router
- `Cmd+Shift+D` → navigate to dashboard (send IPC to renderer)

**Move:** `apps/desktop/src/main/window-state.ts`
- Keep existing implementation, just move to new path

---

## File Structure

```
apps/desktop/
├── index.html                          # Renderer HTML entry
├── package.json                        # Updated deps
├── forge.config.ts                     # Updated for Vite plugin
├── vite.main.config.ts                 # Main process Vite
├── vite.preload.config.ts              # Preload Vite
├── vite.renderer.config.ts             # Renderer Vite (React + Tailwind)
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json                       # Updated
├── src/
│   ├── main/
│   │   ├── main.ts                     # Electron main entry
│   │   ├── preload.ts                  # Context bridge
│   │   ├── auth.ts                     # Auth + deep link handler
│   │   ├── constants.ts                # URLs
│   │   ├── menu.ts                     # App menu
│   │   ├── window-state.ts             # Window persistence
│   │   ├── project-discovery.ts        # IDE scanning
│   │   ├── ipc-handlers.ts             # IPC registration
│   │   └── daemon/
│   │       ├── connection.ts           # WebSocket to /agent-streams
│   │       ├── tool-executor.ts        # Tool dispatch registry
│   │       ├── rpc-handlers.ts         # RPC dispatch
│   │       ├── project-registry.ts     # Project state
│   │       ├── snapshot.ts             # Git-based snapshots
│   │       ├── sandbox.ts              # Path validation
│   │       ├── get-files.ts            # File listing for context
│   │       └── tools/
│   │           ├── read-file.ts
│   │           ├── edit-file.ts
│   │           ├── string-replace.ts
│   │           ├── delete-file.ts
│   │           ├── grep.ts
│   │           ├── glob.ts
│   │           ├── list-directory.ts
│   │           ├── run-terminal-command.ts
│   │           └── batch.ts
│   └── renderer/
│       ├── index.tsx                   # React entry
│       ├── index.css                   # Tailwind base
│       ├── App.tsx                     # Root with providers
│       ├── router.tsx                  # React Router config
│       ├── pages/
│       │   ├── login.tsx
│       │   ├── dashboard.tsx
│       │   └── chat.tsx
│       ├── components/
│       │   ├── ui/                     # Copied from web
│       │   ├── ai-elements/            # Copied from web
│       │   ├── chat/                   # Copied from web (adapted)
│       │   ├── side-panel.tsx
│       │   ├── tool-render.tsx
│       │   ├── context-selector.tsx
│       │   ├── api-key-dialog.tsx
│       │   ├── ama-logo.tsx
│       │   └── file-icons.tsx
│       ├── hooks/
│       │   ├── use-auth.ts
│       │   └── use-auto-resume.ts
│       └── lib/
│           ├── trpc.ts                 # tRPC client
│           ├── constants.ts            # API URLs
│           └── utils.ts                # cn(), helpers

apps/web/src/routes/api/auth/
    └── desktop-callback.tsx            # NEW: deep link redirect endpoint
```

## Files Deleted (old structure)

```
apps/desktop/src/main.ts
apps/desktop/src/preload.ts
apps/desktop/src/auth.ts
apps/desktop/src/navigation.ts
apps/desktop/src/constants.ts
apps/desktop/src/menu.ts
apps/desktop/src/window-state.ts
```

## Key Source Files to Adapt From

| Desktop File | Adapted From |
|---|---|
| `src/main/daemon/tools/*` | `packages/ama-agent/src/tools/*` |
| `src/main/daemon/snapshot.ts` | `packages/ama-agent/src/snapshot/snapshot.ts` |
| `src/main/daemon/sandbox.ts` | `packages/ama-agent/src/lib/sandbox.ts` |
| `src/main/daemon/project-registry.ts` | `packages/ama-agent/src/lib/project-registry.ts` |
| `src/main/daemon/connection.ts` | `packages/ama-agent/src/server.ts` (WebSocket part) |
| `src/main/daemon/rpc-handlers.ts` | `packages/ama-agent/src/lib/rpc-handlers.ts` |
| `src/main/daemon/get-files.ts` | `packages/ama-agent/src/lib/get-files.ts` |
| `src/renderer/pages/dashboard.tsx` | `apps/web/src/routes/_authenticated/dashboard.tsx` |
| `src/renderer/pages/chat.tsx` | `apps/web/src/routes/_authenticated/chat.$projectId.tsx` |
| `src/renderer/components/side-panel.tsx` | `apps/web/src/components/side-panel.tsx` |
| `src/renderer/components/chat/*` | `apps/web/src/components/chat/*` |
| `src/renderer/components/ai-elements/*` | `apps/web/src/components/ai-elements/*` |
| `src/renderer/components/ui/*` | `apps/web/src/components/ui/*` |

## Verification

1. `cd apps/desktop && bun install` - Dependencies install
2. `bun run dev` - Electron app launches with Vite HMR
3. Login page shows → click "Sign In" → browser opens → authenticate → deep link returns → dashboard loads
4. Dashboard shows existing projects (from tRPC) + discovered IDE projects
5. Click project → navigates to chat page
6. Send message → server streams response → tools execute in Electron main process → response appears
7. Daemon status shows "connected" (main process WebSocket is active)
8. Undo/Accept works (snapshots managed by main process)
9. Context selector shows project files (via IPC to main process)
10. `bun run build` → produces macOS DMG
