import { describe, it, expect } from 'vitest';
import { compile } from './helpers';

describe('lexer errors', () => {
    it('throws on an invalid character in source', () => {
        expect(() => compile(`{ x: ! }`)).toThrow();
    });

    it('throws on an unterminated string literal', () => {
        expect(() => compile(`{ x: "no end }`)).toThrow();
    });

    it('throws on a string with an embedded newline', () => {
        expect(() => compile(`{ x: "line\nbreak" }`)).toThrow();
    });
});

describe('parser errors', () => {
    it('throws when the opening brace is missing', () => {
        expect(() => compile(`Object x: 1 }`)).toThrow();
    });

    it('throws when a colon is missing between key and value', () => {
        expect(() => compile(`{ x 1 }`)).toThrow();
    });

    it('throws when the closing brace is missing', () => {
        expect(() => compile(`{ x: 1`)).toThrow();
    });

    it('throws when an imported file does not exist', () => {
        expect(() => compile(`NoSuchType { }`)).toThrow();
    });

    it('throws on @ without a following identifier', () => {
        expect(() => compile(`{ x: @ }`)).toThrow();
    });

    it('throws when @id syntax has no identifier after @', () => {
        expect(() => compile(`Object@ { x: 1 }`)).toThrow();
    });

    it('throws when root is used as a binding id', () => {
        expect(() => compile(`Object@root { x: 1 }`))
            .toThrow("'root' is a reserved binding id");
    });

    it('throws when more than one root object appears in a file', () => {
        expect(() => compile(`{ x: 1 } { y: 2 }`))
            .toThrow('Unexpected token found after root object declaraction');
    });
});

describe('resolver errors', () => {
    it('throws on an unknown id reference', () => {
        expect(() => compile(`{ x: @ghost.val }`))
            .toThrow('Unknown id reference: @ghost');
    });

    it('throws when accessing a property on an undefined id', () => {
        expect(() => compile(`{ x: @missing }`))
            .toThrow('Unknown id reference: @missing');
    });

    it('throws when a native component name is unknown', () => {
        expect(() =>
            compile(`{ x: fn.Nonexistent { } }`)
        ).toThrow();
    });
});

describe('native component validation errors', () => {
    it('fn.map throws when keys and values have different lengths', () => {
        expect(() =>
            compile(`{ m: fn.map { keys: ["a"] values: [1, 2] } }`)
        ).toThrow();
    });

    it('fn.map throws when keys is not an array', () => {
        expect(() =>
            compile(`{ m: fn.map { keys: "bad" values: [1] } }`)
        ).toThrow();
    });

    it('fn.json.decode throws when content is not a string', () => {
        expect(() =>
            compile(`{ d: fn.json.decode { content: 42 } }`)
        ).toThrow();
    });

    it('fn.json.decode throws when expanded content is not valid JSON', () => {
        expect(() =>
            compile(`{ d: fn.json.decode { content: "not json" } }`)
        ).toThrow();
    });

    it('fn.eq throws when left is missing', () => {
        expect(() =>
            compile(`{ r: fn.eq { 1 } }`)
        ).toThrow();
    });

    it('fn.or throws when condition has fewer than 2 elements', () => {
        expect(() =>
            compile(`{ r: fn.or { true } }`)
        ).toThrow();
    });

    it('fn.if throws when condition property is missing', () => {
        expect(() =>
            compile(`{ r: fn.if { then: "x" } }`)
        ).toThrow();
    });

    it('fn.if throws when then property is missing', () => {
        expect(() =>
            compile(`{ r: fn.if { condition: true } }`)
        ).toThrow();
    });
});
