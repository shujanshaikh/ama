---
name: Background Daemon with IDE Detection
overview: Implement a background daemon mode for the ama CLI that runs persistently, auto-restarts on failure, and detects projects open in VS Code, Cursor, and Claude Code by scanning their storage files.
todos:
  - id: daemon-manager
    content: Create daemon.ts with background process spawning, PID management, and auto-restart
    status: pending
  - id: ide-scanner
    content: Create ide-scanner.ts to scan VS Code/Cursor/Claude Code storage files for open projects
    status: pending
  - id: cli-commands
    content: Update cli.ts with start/stop/status/restart/foreground commands and startup output format
    status: pending
  - id: http-endpoints
    content: Add /projects and /daemon/info endpoints to http.ts
    status: pending
  - id: multi-project
    content: Update server.ts to handle multiple project contexts from detected IDEs
    status: pending
---

# Background Daemon Mode with IDE Project Detection

## Architecture Overview

```mermaid
flowchart LR
    CLI[ama CLI] -->|start| Daemon[Background Daemon]
    Daemon --> Scanner[IDE Scanner]
    Scanner --> VSCode[VS Code Storage]
    Scanner --> Cursor[Cursor Storage]
    Scanner --> ClaudeCode[Claude Code Storage]
    Daemon --> WSConn[WebSocket Connection]
    Daemon --> HTTPServer[HTTP Server:3456]
    Daemon -->|crash| AutoRestart[Auto Restart]
```



## Key Changes

### 1. Daemon Manager (`packages/ama-agent/src/lib/daemon.ts`)

Create a new daemon module that handles:

- Background process spawning using `child_process.fork()` with `detached: true`
- PID file management at `~/.ama/daemon.pid`
- Trace ID generation (random hex string)
- Auto-restart logic with configurable max retries
- Graceful shutdown handling

### 2. IDE Storage Scanner (`packages/ama-agent/src/lib/ide-scanner.ts`)

Scan IDE storage files to detect open projects:

- **VS Code**: `~/Library/Application Support/Code/User/globalStorage/storage.json`
- **Cursor**: `~/Library/Application Support/Cursor/User/globalStorage/storage.json`  
- **Claude Code**: `~/Library/Application Support/Claude/User/globalStorage/storage.json` (or similar path)

The scanner will extract recently opened workspaces and expose them via the HTTP server.

### 3. Updated CLI Commands ([`packages/ama-agent/src/cli.ts`](packages/ama-agent/src/cli.ts))

```javascript
ama                  Start daemon in background (default)
ama start            Same as above
ama stop             Stop the running daemon
ama status           Show daemon status and tracked projects
ama restart          Restart the daemon
ama foreground       Run in foreground (current behavior)
ama login/logout     Auth commands (unchanged)
```



### 4. Startup Output Format

```javascript
operation: starting background mode, trace ID: 58bb2e619f8cbc2a66a4fdfe194bab23, version: a0b5c28
detected projects:
    - /Users/you/Projects/ama (Cursor)
    - /Users/you/Projects/other-project (VS Code)
daemon started successfully (PID: 12345)
```



### 5. Updated HTTP Endpoints ([`packages/ama-agent/src/http.ts`](packages/ama-agent/src/http.ts))

Add new endpoints:

- `GET /projects` - List all detected IDE projects
- `GET /daemon/info` - Return trace ID, version, uptime, PID

## Files to Create/Modify