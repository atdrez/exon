#!/bin/bash
# SPDX-License-Identifier: MIT
# Installs the exon CLI globally via npm.
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

cd "$REPO_DIR/runtimes/typescript"

echo "Installing Exon..."
if npm install -g . 2>/dev/null; then
    echo ""
    echo "Done. Run: exon <file.exon>"
elif command -v sudo &> /dev/null; then
    echo "Retrying with sudo..."
    sudo npm install -g .
    echo ""
    echo "Done. Run: exon <file.exon>"
else
    echo ""
    echo "Permission denied. Run as root or configure a user-local npm prefix:" >&2
    echo "  npm config set prefix ~/.local" >&2
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\"" >&2
    echo "Then re-run: bash install.sh" >&2
    exit 1
fi
