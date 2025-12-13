# Ama Agent CLI

A CLI tool that connects to your Convex backend to execute tool calls locally on your machine.

## Installation

### Option 1: Install Globally (Recommended)

```bash
# From the ama-agent package directory
cd packages/ama-agent
bun install
bun run build

# Link globally using npm
npm link

# Or use bun link
bun link

# Or use the install script
./install-global.sh
```

### Option 2: Link Locally to Another Project

```bash
# In your other project directory
npm link /path/to/ama/packages/ama-agent
# or with bun
bun link /path/to/ama/packages/ama-agent
```

### Option 3: Install from Local Path

In your project's `package.json`:
```json
{
  "dependencies": {
    "ama-agent": "file:../path/to/ama/packages/ama-agent"
  }
}
```
Then run `npm install` or `bun install`.

### Option 4: Publish to npm (For Sharing)

```bash
cd packages/ama-agent
npm publish
# Then in your other project: npm install ama-agent
```

## Usage

```bash
ama-agent [options]
```

### Options

- `--help, -h` - Show help message

### Environment Variables

- `SERVER_URL` - WebSocket server URL to connect to (required)
  - Example: `ws://localhost:3000` or `wss://your-server.com`

### Examples

```bash
# Using environment variable
SERVER_URL=ws://localhost:3000 ama-agent

# Or export it first
export SERVER_URL=ws://localhost:3000
ama-agent

# Show help
ama-agent --help
```

## How It Works

1. The CLI connects to a WebSocket server at the provided `SERVER_URL`
2. It listens for tool call messages from the server
3. When tool calls are received, it executes them locally on your machine
4. Results are sent back to the server via WebSocket
5. It automatically reconnects if the connection is lost

## Development

To build the CLI:

```bash
cd packages/ama-agent
bun install
bun run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

### "SERVER_URL is required" error

Make sure to provide the server URL via the `SERVER_URL` environment variable.

### Connection issues

- Check that the server is running and accessible
- Verify the WebSocket URL format (should start with `ws://` or `wss://`)
- Check firewall/network settings
- The CLI will automatically attempt to reconnect every 5 seconds if disconnected
