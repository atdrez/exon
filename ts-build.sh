#!/bin/bash

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNTIME_DIR="$REPO_DIR/runtimes/typescript"

echo "Building TypeScript runtime..."
cd "$RUNTIME_DIR" || exit 1

npm install && npm run build
