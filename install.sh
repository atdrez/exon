#!/bin/bash
# SPDX-License-Identifier: MIT
# Installs the exon CLI and expm package manager globally via npm.
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required. Install it from https://nodejs.org" >&2
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm is required. Install it from https://nodejs.org" >&2
    exit 1
fi

install_global() {
    local dir="$1"
    local name="$2"

    cd "$dir"

    echo "Building $name..."
    npm install
    npm run build

    echo "Installing $name..."
    if npm install -g . 2>/dev/null; then
        return 0
    elif command -v sudo &> /dev/null; then
        echo "Retrying with sudo..."
        sudo npm install -g .
        return 0
    else
        echo ""
        echo "Permission denied. Run as root or configure a user-local npm prefix:" >&2
        echo "  npm config set prefix ~/.local" >&2
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\"" >&2
        echo "Then re-run: bash install.sh" >&2
        exit 1
    fi
}

install_global "$REPO_DIR/runtimes/typescript" "exon"
install_global "$REPO_DIR/tools/package-manager" "expm"

echo ""
echo "Done. Run: exon <file.exon>"
echo "           expm install"
