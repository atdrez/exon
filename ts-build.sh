#!/bin/bash

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNTIME_DIR="$REPO_DIR/runtimes/typescript"

RUN_TESTS=false
for arg in "$@"; do
  if [ "$arg" = "-t" ]; then
    RUN_TESTS=true
  fi
done

echo "Building TypeScript runtime..."
cd "$RUNTIME_DIR" || exit 1

npm install && npm run build || exit 1

if [ "$RUN_TESTS" = true ]; then
  cd "$REPO_DIR" || exit 1
  ./ts-tests.sh
fi
