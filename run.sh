#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <file.exon> [-e] [-p <path>]" >&2
  exit 1
fi

node bin/main.js $@
