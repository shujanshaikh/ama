# AMAI CLI

A CLI tool that connects to your backend server to execute tool calls locally on your machine.

## Installation

### Option 1: Install from npm (Recommended)

```bash
npm install -g amai
```

### Option 2: Install Globally from Source

```bash
# From the cli package directory
cd packages/cli
npm install
npm run build

# Link globally using npm
npm link

# Or use the install script
./install-global.sh
```

### Option 3: Link Locally to Another Project

```bash
# In your other project directory
npm link /path/to/ama/packages/cli
```

### Option 4: Install from Local Path

In your project's `package.json`:
```json
{
  "dependencies": {
    "amai": "file:../path/to/ama/packages/cli"
  }
}
```
Then run `npm install`.

## Usage

```bash
amai [command] [options]
```

### Commands

- `login` - Authorize device
- `logout` - Log out and remove credentials
- `start` - Start background daemon (recommended for better performance)
- `stop` - Stop background daemon
- `status` - Check daemon status
- `project add <path>` - Register a project directory
- `project list` - List registered projects

### Options

- `--help, -h` - Show help message

### Environment Variables

- `SERVER_URL` - WebSocket server URL to connect to (optional, has a default)
  - Example: `ws://localhost:8787` or `wss://your-server.com`

### Examples

```bash
# Login first
amai login

# Start in background mode (recommended)
amai start

# Check daemon status
amai status

# Stop daemon
amai stop

# Register a project
amai project add /path/to/your/project

# List registered projects
amai project list

# Show help
amai --help
```

## How It Works

1. The CLI connects to a WebSocket server
2. It listens for tool call messages from the server
3. When tool calls are received, it executes them locally on your machine
4. Results are sent back to the server via WebSocket
5. It automatically reconnects if the connection is lost

## Development

To build the CLI:

```bash
cd packages/cli
npm install
npm run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

### Connection issues

- Check that the server is running and accessible
- Verify the WebSocket URL format (should start with `ws://` or `wss://`)
- Check firewall/network settings
- The CLI will automatically attempt to reconnect every 5 seconds if disconnected

### Authentication issues

- Run `amai login` to authenticate
- Credentials are stored in `~/.amai/credentials.json`
- Run `amai logout` to clear credentials and re-authenticate
