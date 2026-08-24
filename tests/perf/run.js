#!/usr/bin/env node
// SPDX-License-Identifier: MIT

// Performance harness for the exon TypeScript runtime.
//
// Measures three phases per fixture:
//   1. parse   - Parser.parse(file)               (lexer + parser, no evaluation)
//   2. resolve - Resolver.execute(ast, options)   (walks and evaluates the AST)
//   3. total   - parse + resolve, cold each iteration
//
// Each phase runs a configurable warmup and measurement count and reports
// min / median / mean / max / ops-per-second, printed as a plain table.
//
// Usage (from the repository root):
//   node modules/exon/tests/perf/run.js
//   node modules/exon/tests/perf/run.js --iterations 20 --warmup 3
//   node modules/exon/tests/perf/run.js --only exec_loops,parse_wide
//   node modules/exon/tests/perf/run.js --json
//
// If the compiled runtime is missing (modules/exon/runtimes/typescript/bin),
// the harness exits with an error and instructs the user to build it.

const fs = require("fs");
const path = require("path");

const PERF_DIR = __dirname;
const FIXTURES_DIR = path.join(PERF_DIR, "fixtures");
const RUNTIME_DIR = path.resolve(PERF_DIR, "..", "..", "runtimes", "typescript");
const LIBRARY_PATH = path.join(RUNTIME_DIR, "bin", "library.js");

class ArgumentError extends Error {}

class HarnessOptions {
    constructor() {
        this.iterations = 10;
        this.warmup = 2;
        this.inner = 1;
        this.only = null;
        this.json = false;
    }

    static parse(argv) {
        const options = new HarnessOptions();

        for (let i = 0; i < argv.length; i++) {
            const arg = argv[i];

            switch (arg) {
                case "--iterations":
                case "-n":
                    options.iterations = HarnessOptions.parsePositiveInt(argv[++i], arg);
                    break;
                case "--warmup":
                case "-w":
                    options.warmup = HarnessOptions.parseNonNegativeInt(argv[++i], arg);
                    break;
                case "--inner":
                case "-b":
                    options.inner = HarnessOptions.parsePositiveInt(argv[++i], arg);
                    break;
                case "--only":
                case "-o":
                    options.only = HarnessOptions.parseList(argv[++i], arg);
                    break;
                case "--json":
                    options.json = true;
                    break;
                case "--help":
                case "-h":
                    HarnessOptions.printHelpAndExit();
                    break;
                default:
                    throw new ArgumentError(`unknown argument: ${arg}`);
            }
        }

        return options;
    }

    static parsePositiveInt(value, flag) {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new ArgumentError(`${flag} expects a positive integer, got: ${value}`);
        }
        return parsed;
    }

    static parseNonNegativeInt(value, flag) {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0) {
            throw new ArgumentError(`${flag} expects a non-negative integer, got: ${value}`);
        }
        return parsed;
    }

    static parseList(value, flag) {
        if (typeof value !== "string" || value.length === 0) {
            throw new ArgumentError(`${flag} expects a comma-separated list`);
        }
        return value.split(",").map(part => part.trim()).filter(part => part.length > 0);
    }

    static printHelpAndExit() {
        const help = [
            "Usage: node tests/perf/run.js [options]",
            "",
            "Options:",
            "  -n, --iterations N   number of timed iterations per phase (default 10)",
            "  -w, --warmup N       number of untimed warmup iterations (default 2)",
            "  -b, --inner N        repeat the step N times per timed sample and",
            "                       report the amortized per-repetition time. Use",
            "                       for sub-millisecond fixtures where fixed",
            "                       measurement overhead dominates (default 1)",
            "  -o, --only LIST      run only fixtures whose base name is in LIST (comma-separated)",
            "      --json           print machine-readable JSON instead of a table",
            "  -h, --help           show this help",
        ].join("\n");
        process.stdout.write(help + "\n");
        process.exit(0);
    }
}

function loadRuntime() {
    if (!fs.existsSync(LIBRARY_PATH)) {
        const relative = path.relative(process.cwd(), LIBRARY_PATH);
        throw new Error([
            `exon runtime is not built (missing ${relative}).`,
            "Build it first:",
            "  (cd modules/exon/runtimes/typescript && npm run build)",
        ].join("\n"));
    }
    return require(LIBRARY_PATH);
}

class ScriptManagerFactory {
    constructor(runtime) {
        this.runtime = runtime;
        this.componentConstructors = runtime.Native.components();
    }

    build() {
        const manager = new this.runtime.ScriptRepository();
        for (const Ctor of this.componentConstructors) {
            manager.register(new Ctor());
        }
        return manager;
    }
}

function listFixtures(only) {
    const files = fs.readdirSync(FIXTURES_DIR)
        .filter(name => name.endsWith(".exon"))
        .sort();

    if (only === null) {
        return files;
    }

    const wanted = new Set(only);
    const selected = files.filter(name => wanted.has(name) || wanted.has(name.replace(/\.exon$/, "")));

    if (selected.length === 0) {
        throw new Error(`no fixtures match --only filter: ${only.join(", ")}`);
    }

    return selected;
}

class Stopwatch {
    static timeOnce(fn) {
        const start = process.hrtime.bigint();
        fn();
        const end = process.hrtime.bigint();
        return Number(end - start) / 1e6;
    }
}

class Statistics {
    static summarise(samples) {
        if (samples.length === 0) {
            return { min: 0, max: 0, mean: 0, median: 0, stddev: 0, rsd: 0, opsPerSecond: 0, samples: 0 };
        }

        const sorted = samples.slice().sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;

        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];

        // Sample standard deviation (Bessel-corrected). Relative standard
        // deviation, expressed as a percentage of the mean, makes it easy to
        // tell whether the delta between two runs is signal or noise.
        let stddev = 0;
        if (sorted.length > 1) {
            let sumSquared = 0;
            for (const value of sorted) {
                const delta = value - mean;
                sumSquared += delta * delta;
            }
            stddev = Math.sqrt(sumSquared / (sorted.length - 1));
        }
        const rsd = mean > 0 ? (stddev / mean) * 100 : 0;

        const opsPerSecond = mean > 0 ? 1000 / mean : 0;

        return { min, max, mean, median, stddev, rsd, opsPerSecond, samples: sorted.length };
    }
}

class PhaseRunner {
    constructor(harnessOptions) {
        this.harnessOptions = harnessOptions;
    }

    run(build) {
        const iterations = this.harnessOptions.iterations;
        const warmup = this.harnessOptions.warmup;
        const inner = this.harnessOptions.inner;

        for (let i = 0; i < warmup; i++) {
            for (let j = 0; j < inner; j++) {
                const step = build();
                step();
            }
        }

        const samples = new Array(iterations);
        for (let i = 0; i < iterations; i++) {
            // Build all inner steps first so setup cost stays outside the
            // timed region, then run them back to back inside a single
            // timing window and divide by inner to get per-step time.
            const steps = new Array(inner);
            for (let j = 0; j < inner; j++) {
                steps[j] = build();
            }
            const elapsed = Stopwatch.timeOnce(() => {
                for (let j = 0; j < inner; j++) {
                    steps[j]();
                }
            });
            samples[i] = elapsed / inner;
        }

        return Statistics.summarise(samples);
    }
}

class FixtureBenchmark {
    constructor(runtime, factory, filePath) {
        this.runtime = runtime;
        this.factory = factory;
        this.filePath = filePath;
        this.searchPaths = [path.resolve(RUNTIME_DIR, "..", "..", "examples")];
    }

    parseStep() {
        const manager = this.factory.build();
        const parser = new this.runtime.Parser(manager, this.searchPaths);
        return () => { parser.parse(this.filePath); };
    }

    resolveStep() {
        // Pre-parse: this step measures resolve time only, with a fresh
        // ScriptRepository and RuntimeOptions per iteration but a re-usable
        // AST reference. The Resolver walks the AST from scratch each call.
        const parseManager = this.factory.build();
        const ast = new this.runtime.Parser(parseManager, this.searchPaths).parse(this.filePath);

        const manager = this.factory.build();
        const options = new this.runtime.RuntimeOptions({ run: false, test: false }, []);
        return () => { this.runtime.Resolver.execute(manager, ast, options); };
    }

    totalStep() {
        const manager = this.factory.build();
        const parser = new this.runtime.Parser(manager, this.searchPaths);
        const options = new this.runtime.RuntimeOptions({ run: false, test: false }, []);
        return () => {
            const ast = parser.parse(this.filePath);
            this.runtime.Resolver.execute(manager, ast, options);
        };
    }

    sizeBytes() {
        return fs.statSync(this.filePath).size;
    }
}

class TableFormatter {
    static format(rows) {
        const headers = ["fixture", "phase", "size (B)", "iters", "min (ms)", "median (ms)", "mean (ms)", "max (ms)", "stddev", "rsd %", "ops/s"];
        const widths = headers.map(h => h.length);
        const cells = rows.map(row => [
            row.fixture,
            row.phase,
            TableFormatter.formatInt(row.sizeBytes),
            TableFormatter.formatInt(row.stats.samples),
            TableFormatter.formatMillis(row.stats.min),
            TableFormatter.formatMillis(row.stats.median),
            TableFormatter.formatMillis(row.stats.mean),
            TableFormatter.formatMillis(row.stats.max),
            TableFormatter.formatMillis(row.stats.stddev),
            TableFormatter.formatRsd(row.stats.rsd),
            TableFormatter.formatOps(row.stats.opsPerSecond),
        ]);

        for (const row of cells) {
            for (let i = 0; i < row.length; i++) {
                if (row[i].length > widths[i]) {
                    widths[i] = row[i].length;
                }
            }
        }

        const align = (text, width, alignment) => {
            return alignment === "left" ? text.padEnd(width) : text.padStart(width);
        };
        const alignments = ["left", "left", "right", "right", "right", "right", "right", "right", "right", "right", "right"];

        const lines = [];
        lines.push(headers.map((h, i) => align(h, widths[i], alignments[i])).join("  "));
        lines.push(widths.map(w => "-".repeat(w)).join("  "));
        for (const row of cells) {
            lines.push(row.map((cell, i) => align(cell, widths[i], alignments[i])).join("  "));
        }
        return lines.join("\n");
    }

    static formatMillis(ms) {
        if (ms >= 100) return ms.toFixed(1);
        if (ms >= 10) return ms.toFixed(2);
        if (ms >= 1) return ms.toFixed(3);
        return ms.toFixed(4);
    }

    static formatRsd(rsd) {
        if (rsd >= 100) return rsd.toFixed(0);
        if (rsd >= 10) return rsd.toFixed(1);
        return rsd.toFixed(2);
    }

    static formatOps(ops) {
        if (ops >= 1000) return ops.toFixed(0);
        if (ops >= 100) return ops.toFixed(1);
        if (ops >= 10) return ops.toFixed(2);
        return ops.toFixed(3);
    }

    static formatInt(value) {
        return String(value);
    }
}

class Harness {
    constructor(harnessOptions) {
        this.harnessOptions = harnessOptions;
    }

    execute() {
        const runtime = loadRuntime();
        const factory = new ScriptManagerFactory(runtime);
        const fixtures = listFixtures(this.harnessOptions.only);
        const phaseRunner = new PhaseRunner(this.harnessOptions);

        const rows = [];
        for (const name of fixtures) {
            const filePath = path.join(FIXTURES_DIR, name);
            const benchmark = new FixtureBenchmark(runtime, factory, filePath);
            const sizeBytes = benchmark.sizeBytes();

            const phases = [
                { key: "parse",   build: () => benchmark.parseStep() },
                { key: "resolve", build: () => benchmark.resolveStep() },
                { key: "total",   build: () => benchmark.totalStep() },
            ];

            for (const phase of phases) {
                const stats = phaseRunner.run(phase.build);
                rows.push({ fixture: name, phase: phase.key, sizeBytes, stats });
            }
        }

        this.report(rows);
    }

    report(rows) {
        if (this.harnessOptions.json) {
            process.stdout.write(JSON.stringify({
                iterations: this.harnessOptions.iterations,
                warmup: this.harnessOptions.warmup,
                results: rows.map(row => ({
                    fixture: row.fixture,
                    phase: row.phase,
                    sizeBytes: row.sizeBytes,
                    ...row.stats,
                })),
            }, null, 2) + "\n");
            return;
        }

        const innerNote = this.harnessOptions.inner > 1 ? `, inner=${this.harnessOptions.inner}` : "";
        process.stdout.write(`exon runtime perf (iterations=${this.harnessOptions.iterations}, warmup=${this.harnessOptions.warmup}${innerNote})\n\n`);
        process.stdout.write(TableFormatter.format(rows) + "\n");
    }
}

function main() {
    let options;
    try {
        options = HarnessOptions.parse(process.argv.slice(2));
    } catch (error) {
        if (error instanceof ArgumentError) {
            process.stderr.write(`error: ${error.message}\n`);
            process.stderr.write("run with --help for usage.\n");
            process.exit(2);
        }
        throw error;
    }

    try {
        new Harness(options).execute();
    } catch (error) {
        process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    }
}

main();
