// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/parseArgs';
import { compileWithArgv } from './helpers';

describe('parseArgs', () => {
    describe('no arguments', () => {
        it('returns empty targets and all-false options', () => {
            const result = parseArgs([]);
            expect(result.targets).toEqual([]);
            expect(result.options.extended).toBe(false);
            expect(result.options.path).toEqual([]);
            expect(result.options.test).toBe(false);
            expect(result.options.run).toBe(false);

            expect(result.options.bare).toBe(false);
            expect(result.options.route).toBeNull();
        });
    });

    describe('script path only', () => {
        it('puts script in targets[0] with no options set', () => {
            const result = parseArgs(['script.exon']);
            expect(result.targets).toEqual(['script.exon']);
            expect(result.options.run).toBe(false);
        });
    });

    describe('boolean flags', () => {
        it('recognizes -e / --extended', () => {
            expect(parseArgs(['-e', 'script.exon']).options.extended).toBe(true);
            expect(parseArgs(['--extended', 'script.exon']).options.extended).toBe(true);
        });

        it('recognizes -t / --test', () => {
            expect(parseArgs(['-t', 'script.exon']).options.test).toBe(true);
            expect(parseArgs(['--test', 'script.exon']).options.test).toBe(true);
        });

        it('recognizes -r / --run', () => {
            expect(parseArgs(['-r', 'script.exon']).options.run).toBe(true);
            expect(parseArgs(['--run', 'script.exon']).options.run).toBe(true);
        });

        it('recognizes -b / --bare', () => {
            expect(parseArgs(['-b', 'script.exon']).options.bare).toBe(true);
            expect(parseArgs(['--bare', 'script.exon']).options.bare).toBe(true);
        });

        it('accepts multiple flags before the script', () => {
            const result = parseArgs(['-r', '-t', '-e', 'script.exon']);
            expect(result.options.run).toBe(true);
            expect(result.options.test).toBe(true);
            expect(result.options.extended).toBe(true);
            expect(result.targets).toEqual(['script.exon']);
        });
    });

    describe('--route flag', () => {
        it('defaults to null when not provided', () => {
            expect(parseArgs(['script.exon']).options.route).toBeNull();
        });

        it('splits a slash-separated path into segments', () => {
            const result = parseArgs(['--route', 'foo/bar', 'script.exon']);
            expect(result.options.route).toEqual(['foo', 'bar']);
            expect(result.targets).toEqual(['script.exon']);
        });

        it('strips leading and trailing slashes', () => {
            expect(parseArgs(['--route', '/foo/bar/', 'script.exon']).options.route).toEqual(['foo', 'bar']);
        });

        it('produces an empty array for a bare slash', () => {
            expect(parseArgs(['--route', '/', 'script.exon']).options.route).toEqual([]);
        });

        it('produces a single-element array for a top-level path', () => {
            expect(parseArgs(['--route', 'users', 'script.exon']).options.route).toEqual(['users']);
        });

        it('produces an empty array when the path argument is missing', () => {
            expect(parseArgs(['--route']).options.route).toEqual([]);
        });
    });

    describe('-p / --path flag', () => {
        it('collects a single path', () => {
            const result = parseArgs(['-p', '/lib', 'script.exon']);
            expect(result.options.path).toEqual(['/lib']);
            expect(result.targets).toEqual(['script.exon']);
        });

        it('collects multiple -p entries', () => {
            const result = parseArgs(['-p', '/a', '-p', '/b', 'script.exon']);
            expect(result.options.path).toEqual(['/a', '/b']);
        });

        it('accepts --path long form', () => {
            const result = parseArgs(['--path', '/lib', 'script.exon']);
            expect(result.options.path).toEqual(['/lib']);
        });
    });

    describe('user arguments after script', () => {
        it('passes through plain positional args', () => {
            const result = parseArgs(['script.exon', 'hello', 'world']);
            expect(result.targets).toEqual(['script.exon', 'hello', 'world']);
        });

        it('passes through flag-like args after the script without interpreting them', () => {
            const result = parseArgs(['script.exon', '-p', '-x', '-g', 'any']);
            expect(result.targets).toEqual(['script.exon', '-p', '-x', '-g', 'any']);
            expect(result.options.path).toEqual([]);
        });

        it('stops consuming exon flags once script is reached', () => {
            const result = parseArgs(['-r', 'script.exon', '-t']);
            expect(result.options.run).toBe(true);
            expect(result.options.test).toBe(false);
            expect(result.targets).toEqual(['script.exon', '-t']);
        });
    });

    describe('combined cases', () => {
        it('handles all flags together with user args', () => {
            const result = parseArgs(['-r', '-b', '-p', '/lib', 'script.exon', 'arg1', '--foo']);
            expect(result.options.run).toBe(true);
            expect(result.options.bare).toBe(true);
            expect(result.options.path).toEqual(['/lib']);
            expect(result.targets).toEqual(['script.exon', 'arg1', '--foo']);
        });
    });

    describe('-s / --script flag', () => {
        it('defaults to null', () => {
            expect(parseArgs(['script.exon']).options.script).toBeNull();
        });

        it('recognizes -s <name>', () => {
            const result = parseArgs(['-s', 'dev']);
            expect(result.options.script).toBe('dev');
            expect(result.targets).toEqual([]);
        });

        it('recognizes --script <name>', () => {
            const result = parseArgs(['--script', 'dev']);
            expect(result.options.script).toBe('dev');
        });

        it('forwards extra args after the script name as targets', () => {
            const result = parseArgs(['-s', 'dev', 'devmode=1']);
            expect(result.options.script).toBe('dev');
            expect(result.targets).toEqual(['devmode=1']);
        });

        it('leaves script null when -s is given with no following arg', () => {
            expect(parseArgs(['-s']).options.script).toBeNull();
        });
    });
});

describe('fn.process.argv', () => {
    it('returns the full argv array when called with no argument', () => {
        const argv = ['script.exon', 'hello', 'world'];
        const result = compileWithArgv(`{ v: fn.process.argv {} }`, argv);
        expect(result.v).toEqual(argv);
    });

    it('argv[0] is the script path', () => {
        const argv = ['script.exon', 'arg1'];
        const result = compileWithArgv(`{ v: fn.process.argv { 0 } }`, argv);
        expect(result.v).toBe('script.exon');
    });

    it('argv[1] is the first user argument', () => {
        const argv = ['script.exon', 'hello'];
        const result = compileWithArgv(`{ v: fn.process.argv { 1 } }`, argv);
        expect(result.v).toBe('hello');
    });

    it('returns undefined for an out-of-bounds index', () => {
        const argv = ['script.exon'];
        const result = compileWithArgv(`{ v: fn.process.argv { 5 } }`, argv);
        expect(result.v).toBeUndefined();
    });

    it('user args that look like exon flags are preserved verbatim', () => {
        const argv = ['script.exon', '-p', '-x'];
        const result = compileWithArgv(`{ v: fn.process.argv { 1 } }`, argv);
        expect(result.v).toBe('-p');
    });

    it('returns empty array when no argv is set', () => {
        const result = compileWithArgv(`{ v: fn.process.argv {} }`, []);
        expect(result.v).toEqual([]);
    });

    it('throws when called with more than one argument', () => {
        expect(() => compileWithArgv(`{ v: fn.process.argv { 0 1 } }`, ['s.exon'])).toThrow();
    });

    it('returns null for a named key not found in argv or params', () => {
        const result = compileWithArgv(`{ v: fn.process.argv { "x" } }`, ['s.exon']);
        expect(result.v).toBeNull();
    });

    it('reads a named key from a key=value arg', () => {
        const result = compileWithArgv(`{ v: fn.process.argv { "page" } }`, ['s.exon', 'page=42']);
        expect(result.v).toBe('42');
    });

    it('returns null when the named key is absent from argv', () => {
        const result = compileWithArgv(`{ v: fn.process.argv { "missing" } }`, ['s.exon', 'page=42']);
        expect(result.v).toBeNull();
    });
});
