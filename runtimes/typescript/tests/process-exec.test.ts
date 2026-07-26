// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { compile, compileWithArgv, withTempFile } from './helpers';

describe('fn.process.exec', () => {
    it('runs a shell command and returns its stdout', () => {
        const result = compile(`{ value: fn.string.trim { fn.process.exec { "echo hello" } } }`);
        expect(result.value).toBe('hello');
    });

    it('throws when the command exits with a non-zero status', () => {
        expect(() => compile(`{ value: fn.process.exec { "exit 1" } }`)).toThrow();
    });

    it('runs an executable directly via argv, bypassing shell interpretation', () => {
        withTempFile('echo-args.js', `console.log(JSON.stringify(process.argv.slice(2)))`, (scriptPath) => {
            const dangerous = 'a value with spaces; $HOME | rm -rf / && echo pwned';

            const result = compileWithArgv(
                `using fn.*
                {
                    value: json.decode {
                        content: process.exec {
                            process.argv{"node"}
                            argv: [ process.argv{"script"}, "${dangerous}" ]
                        }
                    }
                }`,
                [`node=${process.execPath}`, `script=${scriptPath}`]
            );

            expect(result.value).toEqual([dangerous]);
        });
    });

    it('feeds a stdin string to the child process', () => {
        withTempFile('echo-stdin.js', `process.stdout.write(require('fs').readFileSync(0, 'utf8'))`, (scriptPath) => {
            const result = compileWithArgv(
                `using fn.*
                {
                    value: process.exec {
                        process.argv{"node"}
                        argv: [ process.argv{"script"} ]
                        stdin: "hello via stdin"
                    }
                }`,
                [`node=${process.execPath}`, `script=${scriptPath}`]
            );

            expect(result.value).toBe('hello via stdin');
        });
    });

    it('feeds stdin in default shell mode too', () => {
        const result = compile(`{
            value: fn.string.trim {
                fn.process.exec { "sort" stdin: "piped through the shell" }
            }
        }`);
        expect(result.value).toBe('piped through the shell');
    });

    it('does not interpret shell syntax in argv without shell: true', () => {
        const result = compile(`{
            value: fn.string.trim {
                fn.process.exec { "echo" argv: [ "hi", "&&", "echo", "bye" ] }
            }
        }`);
        expect(result.value).toBe('hi && echo bye');
    });

    it('interprets argv as shell syntax when shell: true is set', () => {
        const result = compile(`{
            value: fn.process.exec { "echo" argv: [ "hi", "&&", "echo", "bye" ] shell: true }
        }`);
        expect(result.value).toContain('hi');
        expect(result.value).toContain('bye');
        expect(result.value).not.toContain('hi && echo bye');
    });

    it('rejects shell: true without argv', () => {
        expect(() => compile(`{ value: fn.process.exec { "echo" shell: true } }`)).toThrow();
    });

    it('rejects a non-boolean shell', () => {
        expect(() => compile(`{ value: fn.process.exec { "echo" argv: [ "hi" ] shell: "true" } }`)).toThrow();
    });

    it('rejects a non-array argv', () => {
        expect(() => compile(`{ value: fn.process.exec { "echo" argv: "nope" } }`)).toThrow();
    });

    it('rejects an argv array with non-string elements', () => {
        expect(() => compile(`{ value: fn.process.exec { "echo" argv: [ 1, 2 ] } }`)).toThrow();
    });

    it('rejects a non-string stdin', () => {
        expect(() => compile(`{ value: fn.process.exec { "echo" stdin: 123 } }`)).toThrow();
    });
});
