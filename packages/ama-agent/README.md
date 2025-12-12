# Ama Agent CLI

A CLI tool that connects to your Convex backend to execute tool calls locally on your machine.

## Installation

### Option 1: Install Globally (Recommended)

```bash
# From the ama-agent package directory
cd packages/ama-agent
bun install
bun run build

# Link globally (recommended - use npm)
npm link --global

# Or use bun link (if npm doesn't work)
bun link --global

# Or use the install script
./install-global.sh
```

### Option 2: Install in Your Project

```bash
# In your project directory
npm install ama-agent
# or
bun add ama-agent
```

### Option 3: Use via npx/bunx (No Installation)

```bash
# Build the package first, then use via npx
npx ama-agent --code 123456 --url https://your-deployment.convex.cloud
```

## Usage

```bash
ama-agent [options]
```

### Options

- `--code, -c <code>` - Session code to link with web UI
- `--url, -u <url>` - Convex deployment URL (or set CONVEX_URL env var)
- `--dir, -d <path>` - Working directory (default: current directory)
- `--help, -h` - Show help message

### Environment Variables

- `CONVEX_URL` - Convex deployment URL (required)
- `SESSION_CODE` - Session code to link with web UI
- `WORKING_DIRECTORY` - Working directory for file operations

### Examples

```bash
# Using command line arguments
ama-agent --code 123456 --url https://your-deployment.convex.cloud

# Using environment variables
export CONVEX_URL=https://your-deployment.convex.cloud
export SESSION_CODE=123456
ama-agent

# Specify a different working directory
ama-agent --code 123456 --url https://your-deployment.convex.cloud --dir /path/to/project
```

## How It Works

1. The CLI connects to your Convex backend using the provided URL
2. It creates or links to a session using the session code
3. It polls for pending tool calls from the backend
4. When tool calls are queued, it executes them locally on your machine
5. Results are reported back to the backend

## Development

To build the CLI:

```bash
cd packages/ama-agent
bun install
bun run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

### "Convex URL is required" error

Make sure to provide the Convex URL either via `--url` flag or `CONVEX_URL` environment variable.

### "No CLI session connected" error

Make sure the CLI is running and connected. Check that:
1. The session code matches between the web UI and CLI
2. The CLI is sending heartbeats (check console output)
3. The Convex URL is correct
