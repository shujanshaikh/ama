# Lovable, but for localhost

An AI agent that lives in your browser and makes changes to your local codebase.

## Demo

<video controls width="640">
  <source src="https://pub-f6f7266ff5af48c8afa45503071de743.r2.dev/ama/1767525316123447.MP4" type="video/mp4" />
  Your browser does not support the video tag.
</video>


## Project Architecture

```
ama/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   └── server/      # Backend API server (Hono)
├── packages/
│   └── ama-agent/   # CLI agent for local codebase operations
    ├──db/            # Database schema and queries
```

## Tech Stack

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Turborepo** - Optimized monorepo build system

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed

### Installation

```bash
bun install
```

### Environment Variables

Create `.env` files with the following variables:

**apps/web/.env**
```env
WORKOS_API_KEY=''
WORKOS_CLIENT_ID=''
WORKOS_COOKIE_PASSWORD=""
DATABASE_URL=""
WORKOS_REDIRECT_URI=http://localhost:3001/api/auth/callback
UPLOADTHING_TOKEN=''
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL="ws://localhost:3000"
```

**apps/server/.env**
```env
WORKOS_CLIENT_ID=""
WORKOS_API_KEY=""
DATABASE_URL=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
EXA_API_KEY=""
SUPERMEMORY_API_KEY=""
OPENCODE_API_KEY=""
REDIS_URL=""
```

### Running the Development Server

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.

### Building the CLI Agent

```bash
cd packages/ama-agent
bun run build
bun link
```

This will build and link the CLI globally so you can use it from any directory.

## Available Scripts

- `bun run dev` - Start all applications in development mode
- `bun run build` - Build all applications
- `bun run dev:web` - Start only the web application
- `bun run check-types` - Check TypeScript types across all apps
