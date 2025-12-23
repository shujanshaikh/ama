#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                           AMA CLI Installer                                ║
# ║                                                                           ║
# ║  One-line installation:                                                   ║
# ║    curl -fsSL https://amadev.vercel.app/install.sh | bash                 ║
# ║                                                                           ║
# ║  Or install directly via npm:                                             ║
# ║    npm install -g amai                                                    ║
# ║                                                                           ║
# ║  More info: https://amadev.vercel.app/install                             ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Package info
PACKAGE_NAME="amai"
NPM_PACKAGE="amai"

# Print banner
print_banner() {
    echo ""
    echo -e "${PURPLE}${BOLD}"
    echo "    ╔═══════════════════════════════════════╗"
    echo "    ║                                       ║"
    echo "    ║       🚀  AMA CLI Installer  🚀       ║"
    echo "    ║                                       ║"
    echo "    ╚═══════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Print step
step() {
    echo -e "${CYAN}▸${NC} $1"
}

# Print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Print warning
warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Print info
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     OS="linux";;
        Darwin*)    OS="macos";;
        CYGWIN*|MINGW*|MSYS*)    OS="windows";;
        *)          OS="unknown";;
    esac
    echo "$OS"
}

# Install using npm
install_with_npm() {
    step "Installing AMA CLI using npm..."
    
    if npm install -g "$NPM_PACKAGE@latest" 2>/dev/null; then
        success "Successfully installed with npm!"
        return 0
    else
        # Try with sudo for Unix-like systems
        if [ "$(detect_os)" != "windows" ]; then
            warn "Installation failed. Trying with sudo..."
            if sudo npm install -g "$NPM_PACKAGE@latest"; then
                success "Successfully installed with npm (sudo)!"
                return 0
            fi
        fi
        return 1
    fi
}

# Install using yarn
install_with_yarn() {
    step "Installing AMA CLI using yarn..."
    
    if yarn global add "$NPM_PACKAGE@latest" 2>/dev/null; then
        success "Successfully installed with yarn!"
        return 0
    else
        return 1
    fi
}

# Install using pnpm
install_with_pnpm() {
    step "Installing AMA CLI using pnpm..."
    
    if pnpm add -g "$NPM_PACKAGE@latest" 2>/dev/null; then
        success "Successfully installed with pnpm!"
        return 0
    else
        return 1
    fi
}

# Install using bun
install_with_bun() {
    step "Installing AMA CLI using bun..."
    
    if bun add -g "$NPM_PACKAGE@latest" 2>/dev/null; then
        success "Successfully installed with bun!"
        return 0
    else
        return 1
    fi
}

# Install Node.js if not present
install_node() {
    OS=$(detect_os)
    
    echo ""
    error "Node.js/npm is not installed."
    echo ""
    info "Please install Node.js first:"
    echo ""
    
    case "$OS" in
        macos)
            echo "  Using Homebrew:"
            echo -e "    ${CYAN}brew install node${NC}"
            echo ""
            echo "  Or download from:"
            echo -e "    ${CYAN}https://nodejs.org/${NC}"
            ;;
        linux)
            echo "  Using apt (Debian/Ubuntu):"
            echo -e "    ${CYAN}sudo apt update && sudo apt install nodejs npm${NC}"
            echo ""
            echo "  Using dnf (Fedora):"
            echo -e "    ${CYAN}sudo dnf install nodejs npm${NC}"
            echo ""
            echo "  Using nvm (recommended):"
            echo -e "    ${CYAN}curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash${NC}"
            echo -e "    ${CYAN}nvm install node${NC}"
            ;;
        windows)
            echo "  Download from:"
            echo -e "    ${CYAN}https://nodejs.org/${NC}"
            echo ""
            echo "  Or using Chocolatey:"
            echo -e "    ${CYAN}choco install nodejs${NC}"
            ;;
        *)
            echo "  Download from:"
            echo -e "    ${CYAN}https://nodejs.org/${NC}"
            ;;
    esac
    
    echo ""
    exit 1
}

# Verify installation
verify_installation() {
    echo ""
    step "Verifying installation..."
    
    if command_exists amai; then
        success "Amai CLI installed successfully!"
        echo ""
        echo -e "${GREEN}${BOLD}Installation complete!${NC}"
        echo ""
        info "Launching amai..."
        echo ""
        echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        # Launch amai automatically
        exec amai
    else
        error "Installation verification failed."
        echo ""
        warn "The CLI might not be in your PATH. Try:"
        echo ""
        echo "  1. Restart your terminal"
        echo "  2. Check your PATH includes npm's global bin directory:"
        echo -e "     ${CYAN}export PATH=\"\$PATH:\$(npm config get prefix)/bin\"${NC}"
        echo ""
        return 1
    fi
}

# Main installation logic
main() {
    print_banner
    
    OS=$(detect_os)
    info "Detected OS: $OS"
    echo ""
    
    # Check for package managers
    HAS_NPM=$(command_exists npm && echo "1" || echo "0")
    HAS_YARN=$(command_exists yarn && echo "1" || echo "0")
    HAS_PNPM=$(command_exists pnpm && echo "1" || echo "0")
    HAS_BUN=$(command_exists bun && echo "1" || echo "0")
    
    # Try installation with available package managers
    INSTALLED=0
    
    # Priority: bun > pnpm > yarn > npm
    if [ "$HAS_BUN" = "1" ]; then
        if install_with_bun; then
            INSTALLED=1
        fi
    fi
    
    if [ "$INSTALLED" = "0" ] && [ "$HAS_PNPM" = "1" ]; then
        if install_with_pnpm; then
            INSTALLED=1
        fi
    fi
    
    if [ "$INSTALLED" = "0" ] && [ "$HAS_YARN" = "1" ]; then
        if install_with_yarn; then
            INSTALLED=1
        fi
    fi
    
    if [ "$INSTALLED" = "0" ] && [ "$HAS_NPM" = "1" ]; then
        if install_with_npm; then
            INSTALLED=1
        fi
    fi
    
    # If no package manager found
    if [ "$INSTALLED" = "0" ]; then
        if [ "$HAS_NPM" = "0" ] && [ "$HAS_YARN" = "0" ] && [ "$HAS_PNPM" = "0" ] && [ "$HAS_BUN" = "0" ]; then
            install_node
        else
            echo ""
            error "Installation failed with all available package managers."
            echo ""
            info "Please try installing manually:"
            echo -e "    ${CYAN}npm install -g $NPM_PACKAGE${NC}"
            echo ""
            exit 1
        fi
    fi
    
    # Verify the installation
    verify_installation
}

# Run main function
main
