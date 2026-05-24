#!/bin/bash

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$1" ]; then
  echo "Usage: $0 <file.exon> [-e] [-p <path>]" >&2
  exit 1
fi

node "$REPO_DIR/runtimes/typescript/bin/main.js" "$@"
