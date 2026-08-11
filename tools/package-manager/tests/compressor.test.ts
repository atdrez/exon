// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { compressExon, compressJs } from '../src/Compressor';

describe('compressExon', () => {
    it('strips single-line comments', () => {
        const source = 'flow.node {\n    // a comment\n    name: "foo"\n}';
        expect(compressExon(source)).toBe('flow.node{name:"foo"}');
    });

    it('strips multiline *** comments', () => {
        const source = 'flow.node {\n*** this\nspans lines ***\n    name: "foo"\n}';
        expect(compressExon(source)).toBe('flow.node{name:"foo"}');
    });

    it('collapses whitespace between punctuation to nothing', () => {
        const source = 'flow.node {\n    name: "foo" ;\n    value: 1\n}';
        expect(compressExon(source)).toBe('flow.node{name:"foo";value:1}');
    });

    it('needs no separator at all between a string and the next property', () => {
        const source = 'flow.node {\n    name: "foo"\n    value: 1\n}';
        expect(compressExon(source)).toBe('flow.node{name:"foo"value:1}');
    });

    it('preserves the mandatory comma between array elements', () => {
        const source = 'flow.node {\n    items: [ 1 ,\n        2 ,\n        3 ]\n}';
        expect(compressExon(source)).toBe('flow.node{items:[1,2,3]}');
    });

    it('keeps a single separating space between two word-like tokens', () => {
        const source = 'using foo as bar';
        expect(compressExon(source)).toBe('using foo as bar');
    });

    it('leaves single-line string contents untouched, including internal whitespace', () => {
        const source = 'flow.node { name: "foo   bar // not a comment" }';
        expect(compressExon(source)).toBe('flow.node{name:"foo   bar // not a comment"}');
    });

    it('leaves multiline string contents byte-for-byte untouched', () => {
        const source = [
            'flow.script {',
            '    content: """',
            '        line one',
            '',
            '        line two   ',
            '    """',
            '}',
        ].join('\n');

        const result = compressExon(source);
        expect(result).toContain('"""\n        line one\n\n        line two   \n    """');
        expect(result.startsWith('flow.script{content:')).toBe(true);
    });

    it('does not merge adjacent identifiers across removed whitespace', () => {
        const source = 'foo   bar';
        const result = compressExon(source);
        expect(result).toBe('foo bar');
        // never allowed to become the single identifier "foobar"
        expect(result).not.toBe('foobar');
    });

    it('leaves a multiline string containing *** untouched, even at its edges', () => {
        const source = '{ content: """*** lorem ipsum ***""" }';
        expect(compressExon(source)).toBe('{content:"""*** lorem ipsum ***"""}');
    });

    it('strips a single-line comment even when its text looks like a *** comment', () => {
        const source = '{ content: // comment\n20\n}';
        expect(compressExon(source)).toBe('{content:20}');
    });

    it('strips a single-line comment whose text contains literal *** markers', () => {
        const source = '{ content: // ***comment***\n20\n}';
        expect(compressExon(source)).toBe('{content:20}');
    });

    it('throws on a *** comment left unterminated by a *** that was absorbed into a following identifier', () => {
        // The first "*** ***" closes immediately, throw error
        const source = '{ content: *** ***comment*** *** "hello" }';
        expect(() => compressExon(source)).toThrow(/unterminated|Unexpected end of buffer/i);
    });

    it('keeps @-references as separate tokens from surrounding identifiers', () => {
        const source = '{ x: string.join { @a @b } }';
        expect(compressExon(source)).toBe('{x:string.join{@a@b}}');
    });

    it('does not need a separator between a string/number and a following @-reference or brace', () => {
        const source = '{ x: string.join { "a" 1 "b" } }';
        expect(compressExon(source)).toBe('{x:string.join{"a"1"b"}}');
    });

    it('keeps a separator between an @-reference and the next bare identifier', () => {
        const source = '{ x: @a y: @b }';
        expect(compressExon(source)).toBe('{x:@a y:@b}');
    });

    it('does not stop a *** comment early at a plain word, even one repeated across two comments', () => {
        const source = '{ x: *** first *** "foo" *** //second *** }';
        expect(compressExon(source)).toBe('{x:"foo"}');
    });

    it('lets a *** comment absorb text that looks like a // comment as plain content', () => {
        const source = '{ x: //comment\n "foo" *** //second *** }';
        expect(compressExon(source)).toBe('{x:"foo"}');
    });

    it('is idempotent on already-compressed input', () => {
        const source = 'flow.node{name:"foo";value:1}';
        expect(compressExon(source)).toBe(source);
    });

    it('does not need a separator before a scoped package identifier, since the leading plus already breaks the token', () => {
        const source = 'using +google.apis';
        expect(compressExon(source)).toBe('using+google.apis');
    });
});

describe('compressJs', () => {
    it('accepts a top-level return, as used by exs script bodies loaded via new Function(content)', async () => {
        const source = `
            // this file is loaded as a function body (js/eval.ts: new Function(content)),
            // not run as a standalone program, so a bare top-level return is valid here
            return function({ input }) {
                return input.getString("value");
            }
        `;

        const result = await compressJs(source);

        expect(result).not.toContain('//');
        expect(result.startsWith('return')).toBe(true);

        const fn = new Function(result)();
        expect(fn({ input: { getString: () => 'hello' } })).toBe('hello');
    });

    it('removes comments and whitespace while preserving behavior', async () => {
        const source = `
            // returns the sum of two numbers
            function add(a, b) {
                // a trivial comment
                return a + b;
            }

            module.exports = { add };
        `;

        const result = await compressJs(source);

        expect(result).not.toContain('//');
        expect(result.length).toBeLessThan(source.length);

        const moduleShim = { exports: {} as { add: (a: number, b: number) => number } };
        new Function('module', result)(moduleShim);
        expect(moduleShim.exports.add(2, 3)).toBe(5);
    });
});
