#!/bin/bash

# AMA CLI Installer
# Install: curl -fsSL https://amadev.vercel.app/install.sh | bash

set -e

# Colors - minimal palette
DIM='\033[2m'
RESET='\033[0m'
WHITE='\033[1;37m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'

# Package info
NPM_PACKAGE="amai"

# Minimal banner
print_banner() {
    echo ""
    echo -e "${WHITE}ama${RESET}"
    echo -e "${DIM}cli installer${RESET}"
    echo ""
}

# Print functions - clean and minimal
log() {
    echo -e "${DIM}→${RESET} $1"
}

success() {
    echo -e "${GREEN}✓${RESET} $1"
}

warn() {
    echo -e "${YELLOW}!${RESET} $1"
}

fail() {
    echo -e "${RED}×${RESET} $1"
}

# Check if command exists
has() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux";;
        Darwin*)    echo "macos";;
        CYGWIN*|MINGW*|MSYS*)    echo "windows";;
        *)          echo "unknown";;
    esac
}

# Install using npm
install_npm() {
    log "installing via npm..."
    
    if npm install -g "$NPM_PACKAGE@latest" 2>/dev/null; then
        return 0
    elif [ "$(detect_os)" != "windows" ]; then
        log "retrying with sudo..."
        if sudo npm install -g "$NPM_PACKAGE@latest"; then
            return 0
        fi
    fi
    return 1
}

# Install using yarn
install_yarn() {
    log "installing via yarn..."
    yarn global add "$NPM_PACKAGE@latest" 2>/dev/null
}

# Install using pnpm
install_pnpm() {
    log "installing via pnpm..."
    pnpm add -g "$NPM_PACKAGE@latest" 2>/dev/null
}

# Install using bun
install_bun() {
    log "installing via bun..."
    bun add -g "$NPM_PACKAGE@latest" 2>/dev/null
}

# Show Node.js install instructions
show_node_install() {
    echo ""
    fail "node.js not found"
    echo ""
    echo -e "${DIM}install node.js:${RESET}"
    echo ""
    
    case "$(detect_os)" in
        macos)
            echo -e "  ${CYAN}brew install node${RESET}"
            echo -e "  ${DIM}or${RESET} https://nodejs.org"
            ;;
        linux)
            echo -e "  ${CYAN}curl -fsSL https://fnm.vercel.app/install | bash${RESET}"
            echo -e "  ${CYAN}fnm install --lts${RESET}"
            echo ""
            echo -e "  ${DIM}or${RESET} https://nodejs.org"
            ;;
        *)
            echo -e "  https://nodejs.org"
            ;;
    esac
    echo ""
    exit 1
}

# Verify and launch
verify() {
    echo ""
    
    if has amai; then
        success "installed"
        echo ""
        exec amai
    else
        fail "verification failed"
        echo ""
        echo -e "${DIM}try:${RESET}"
        echo "  1. restart terminal"
        echo -e "  2. ${CYAN}export PATH=\"\$PATH:\$(npm config get prefix)/bin\"${RESET}"
        echo ""
        return 1
    fi
}

# Main
main() {
    print_banner
    
    log "$(detect_os)"
    
    # Try package managers in order: bun > pnpm > yarn > npm
    if has bun && install_bun; then
        success "installed via bun"
        verify
        return
    fi
    
    if has pnpm && install_pnpm; then
        success "installed via pnpm"
        verify
        return
    fi
    
    if has yarn && install_yarn; then
        success "installed via yarn"
        verify
        return
    fi
    
    if has npm && install_npm; then
        success "installed via npm"
        verify
        return
    fi
    
    # No package manager found
    if ! has npm && ! has yarn && ! has pnpm && ! has bun; then
        show_node_install
    else
        echo ""
        fail "installation failed"
        echo ""
        echo -e "${DIM}try manually:${RESET}"
        echo -e "  ${CYAN}npm install -g $NPM_PACKAGE${RESET}"
        echo ""
        exit 1
    fi
}

main
