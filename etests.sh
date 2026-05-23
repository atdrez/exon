#!/bin/bash

if [ "$1" = "-r" ]; then
    ok=0
    fail=0
    while IFS= read -r f; do
        if node bin/main.js -t -p ./samples "$f" >/dev/null 2>&1; then
            printf "\033[0;32m[OK]\033[0m\t%s\n" "$f"
            ok=$((ok + 1))
        else
            printf "\033[0;31m[ERROR]\033[0m\t%s\n" "$f"
            fail=$((fail + 1))
        fi
    done < <(find samples -name "*.exon" | sort)

    color=$( [ "$fail" -gt 0 ] && echo "\033[0;31m" || echo "\033[0;32m" )
    printf "\n${color}Results: %d ok, %d errors\033[0m\n" "$ok" "$fail"
    [ "$fail" -gt 0 ] && exit 1 || exit 0
else
    for f in samples/tests/*.exon; do
        node bin/main.js -t -p ./samples "$f" 2>&1
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
fi
