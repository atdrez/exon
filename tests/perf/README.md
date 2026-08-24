# exon runtime performance tests

Micro-benchmarks for the exon TypeScript runtime. The suite measures three
phases per fixture: parse (lexer + parser only), resolve (walking and
evaluating a pre-parsed AST), and total (parse + resolve, cold each
iteration).

This directory intentionally lives outside `runtimes/typescript/tests`, so
`vitest` never picks the fixtures up as unit tests. They are performance
benchmarks, not correctness tests.

## Running

The perf runner uses the compiled runtime under
`runtimes/typescript/bin`. Build it once first if needed:

```
cd runtimes/typescript && npm run build
```

Then, from the repository root:

```
node tests/perf/run.js
```

or, for a stabler measurement:

```
node tests/perf/run.js --iterations 20 --warmup 3
```

### Options

- `-n, --iterations N` - timed iterations per phase (default 10).
- `-w, --warmup N` - untimed warmup iterations per phase (default 2).
- `-b, --inner N` - repeat the step N times per timed sample and report the
  amortized per-repetition time (default 1). Use this for sub-millisecond
  fixtures where fixed measurement overhead (bigint conversion, GC pressure
  from setup) dominates a single run. Setup work is still done outside the
  timed region for each of the N repetitions.
- `-o, --only LIST` - comma-separated list of fixture names to run
  (base name with or without the `.exon` extension).
- `--json` - print machine-readable JSON instead of a table.
- `-h, --help` - show help.

## Fixtures

Each fixture targets one runtime hotspot. Numbers are approximate and only
meaningful when compared against each other on the same machine.

- `parse_wide.exon` - a large flat object with many top-level properties of
  every literal kind. Dominated by lexer/parser cost.
- `parse_deep.exon` - a deeply nested object graph. Exercises brace tracking
  and recursive descent depth in the parser.
- `exec_math.exon` - chained arithmetic, math library calls, and a
  `repeat`-driven expression loop. Dominated by resolver cost.
- `exec_strings.exon` - joins, replaces, repeats, and case conversions over
  a moderate list of words.
- `exec_loops.exon` - `repeat`, `foreach` (including nested), and `while`
  loops, each executing a small body many times.
- `exec_dict.exon` - a large `fn.dict` built from static keys, dynamic
  keys, and a synthetic list built with `repeat` + `foreach`.
- `exec_arrays.exon` - large flat arrays of primitives plus nested
  object arrays. Exercises `parseArrayRecursive` in the resolver and
  array literal handling in the parser.
- `exec_inherit.exon` - many instances of the same base object with
  varying overrides (plain, single-field, full override), plus deferred
  scripts inheriting from a base. Exercises `resolveRecursive` base
  chain walks, id registration, and `__base__` native lookup.

## Interpreting the output

The table columns are:

- `size (B)` - source file size in bytes.
- `iters` - number of timed samples.
- `min / median / mean / max` - per-iteration wall time in milliseconds.
- `stddev` - sample standard deviation of the timed iterations (ms).
- `rsd %` - relative standard deviation, `100 * stddev / mean`. Useful for
  telling whether a delta between two runs is signal or noise; when it is
  above roughly 5 %, single-digit-percent changes in `mean` are not
  distinguishable from noise without more iterations.
- `ops/s` - `1000 / mean` (iterations per second).

The harness reports each phase independently. `total` should be roughly
`parse + resolve` but the two are measured separately so the two costs can
be compared directly.
