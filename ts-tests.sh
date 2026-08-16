#!/bin/bash

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE="node"
MAIN="$REPO_DIR/runtimes/typescript/bin/main.js"
EXAMPLES="$REPO_DIR/examples"
FIXTURES="$REPO_DIR/tests/fixtures"

print_elapsed() {
    printf "Elapsed: %ds\n" "$SECONDS"
}

if [ "$1" = "--examples" ]; then
    ok=0
    fail=0
    while IFS= read -r f; do
        if [[ "$f" == *.app.exon ]]; then
            continue
        fi
        if [[ "$f" == *.run.exon ]]; then
            cmd=("$NODE" "$MAIN" -r "$f" -p "$EXAMPLES")
        else
            cmd=("$NODE" "$MAIN" -p "$EXAMPLES" "$f")
        fi
        if [ "$2" = "--compare" ]; then
            actual_output="$("${cmd[@]}" </dev/null 2>&1)"
            if [ -f "$f.out" ] && [ "$actual_output" = "$(cat "$f.out")" ]; then
                success=1
            else
                success=0
            fi
        else
            if [ "$2" = "--output" ]; then
                output_file="$f.out"
            else
                output_file="/dev/null"
            fi
            if "${cmd[@]}" </dev/null >"$output_file" 2>&1; then
                success=1
            else
                success=0
            fi
        fi

        if [ "$success" -eq 1 ]; then
            printf "\033[0;32m[OK]\033[0m\t%s\n" "$f"
            ok=$((ok + 1))
        else
            printf "\033[0;31m[ERROR]\033[0m\t%s\n" "$f"
            fail=$((fail + 1))
        fi
    done < <(find "$EXAMPLES" -name "*.exon" | sort)

    color=$( [ "$fail" -gt 0 ] && echo "\033[0;31m" || echo "\033[0;32m" )
    printf "\n${color}Results: %d ok, %d errors\033[0m\n" "$ok" "$fail"
    print_elapsed
    [ "$fail" -gt 0 ] && exit 1 || exit 0
else
    cd "$REPO_DIR/runtimes/typescript/" && npm run test || exit 1
    cd "$REPO_DIR"

    for f in "$FIXTURES"/*.exon; do
        "$NODE" "$MAIN" -t -p "$EXAMPLES" "$f" 2>&1
    done | awk '
        /\[OK\]/   { ok++;   gsub(/\[OK\]/,   "\033[0;32m[OK]\033[0m") }
        /\[FAIL\]/ { fail++; gsub(/\[FAIL\]/, "\033[0;31m[FAIL]\033[0m") }
        { print }
        END {
            color = (fail > 0) ? "\033[0;31m" : "\033[0;32m"
            reset = "\033[0m"
            printf "\n" color "Results: %d passed, %d failed" reset "\n", ok+0, fail+0
            exit (fail > 0 ? 1 : 0)
        }
    '
    status=$?
    print_elapsed
    exit "$status"
fi
