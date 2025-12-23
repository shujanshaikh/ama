#!/bin/bash

# Alternative global installation script for Ama Agent CLI

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Installing AMAI CLI globally..."

# Build first
echo "🔨 Building CLI..."
bun run build

# Make sure dist/cli.js is executable
chmod +x dist/cli.js

# Try npm link first (more reliable)
if command -v npm &> /dev/null; then
    echo "📦 Using npm to link globally..."
    bun link
    echo "✅ Installed via npm link!"
    echo ""
    echo "The 'amai' command should now be available globally."
    echo "If it's not found, make sure npm's global bin directory is in your PATH:"
    echo "  export PATH=\"\$PATH:\$(npm config get prefix)/bin\""
    exit 0
fi

# Fallback: Manual symlink
if [ -z "$BUN_INSTALL" ]; then
    BUN_INSTALL="$HOME/.bun/bin"
fi

if [ ! -d "$BUN_INSTALL" ]; then
    mkdir -p "$BUN_INSTALL"
fi

CLI_PATH="$SCRIPT_DIR/dist/cli.js"
SYMLINK_PATH="$BUN_INSTALL/amai"

if [ -L "$SYMLINK_PATH" ]; then
    rm "$SYMLINK_PATH"
fi

ln -s "$CLI_PATH" "$SYMLINK_PATH"
chmod +x "$SYMLINK_PATH"

echo "✅ Created symlink: $SYMLINK_PATH -> $CLI_PATH"
echo ""
echo "Make sure $BUN_INSTALL is in your PATH:"
echo "  export PATH=\"\$PATH:$BUN_INSTALL\""
echo ""
echo "Then you can use: amai --help"
