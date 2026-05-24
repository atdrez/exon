import { describe, it, expect } from 'vitest';
import { compile } from './helpers';

// ---------------------------------------------------------------------------
// Basic value types
// ---------------------------------------------------------------------------

describe('basic values', () => {
    it('resolves a string property', () => {
        expect(compile(`{ name: "hello" }`)).toEqual({ name: 'hello' });
    });

    it('resolves an integer property', () => {
        expect(compile(`{ count: 42 }`)).toEqual({ count: 42 });
    });

    it('resolves a float property', () => {
        expect(compile(`{ ratio: 3.14 }`)).toEqual({ ratio: 3.14 });
    });

    it('resolves a negative number', () => {
        expect(compile(`{ offset: -7 }`)).toEqual({ offset: -7 });
    });

    it('resolves a negative float', () => {
        expect(compile(`{ delta: -1.5 }`)).toEqual({ delta: -1.5 });
    });

    it('resolves true', () => {
        expect(compile(`{ flag: true }`)).toEqual({ flag: true });
    });

    it('resolves false', () => {
        expect(compile(`{ flag: false }`)).toEqual({ flag: false });
    });

    it('resolves null', () => {
        expect(compile(`{ ref: null }`)).toEqual({ ref: null });
    });

    it('treats semicolons as optional separators', () => {
        const withSemi    = compile(`{ a: 1; b: 2; }`);
        const withoutSemi = compile(`{ a: 1 b: 2 }`);
        expect(withSemi).toEqual(withoutSemi);
    });

    it('strips __name__, __file__ and other private keys from output', () => {
        const result = compile(`{ x: 1 }`);
        expect(Object.keys(result).some(k => k.startsWith('__'))).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

describe('comments', () => {
    it('strips line comments', () => {
        expect(compile(`{\n// comment\nx: 1\n}`)).toEqual({ x: 1 });
    });

    it('strips inline comments', () => {
        expect(compile(`{ x: 1 // inline\n y: 2 }`)).toEqual({ x: 1, y: 2 });
    });
});

// ---------------------------------------------------------------------------
// Arrays
// ---------------------------------------------------------------------------

describe('arrays', () => {
    it('resolves an empty array', () => {
        expect(compile(`{ items: [] }`)).toEqual({ items: [] });
    });

    it('resolves an array of numbers', () => {
        expect(compile(`{ nums: [1, 2, 3] }`)).toEqual({ nums: [1, 2, 3] });
    });

    it('resolves an array of strings', () => {
        expect(compile(`{ tags: ["a", "b"] }`)).toEqual({ tags: ['a', 'b'] });
    });

    it('resolves an array of mixed primitives', () => {
        expect(compile(`{ mix: [1, "x", true, null] }`))
            .toEqual({ mix: [1, 'x', true, null] });
    });

    it('resolves an array of inline objects', () => {
        const result = compile(`{ pts: [ { x: 1 }, { x: 2 } ] }`);
        expect(result).toEqual({ pts: [{ x: 1 }, { x: 2 }] });
    });
});

// ---------------------------------------------------------------------------
// Nested objects
// ---------------------------------------------------------------------------

describe('nested objects', () => {
    it('resolves a nested Object', () => {
        expect(compile(`{ inner: { a: 1 } }`))
            .toEqual({ inner: { a: 1 } });
    });

    it('resolves deeply nested objects', () => {
        const result = compile(`{ a: { b: { c: 42 } } }`);
        expect(result).toEqual({ a: { b: { c: 42 } } });
    });
});

// ---------------------------------------------------------------------------
// Inheritance
// ---------------------------------------------------------------------------

describe('inheritance', () => {
    it('inherits all properties from a parent file', () => {
        const result = compile(
            `Base { }`,
            { 'Base.exon': `{ color: "red" size: 10 }` }
        );
        expect(result).toEqual({ color: 'red', size: 10 });
    });

    it('overrides a parent property', () => {
        const result = compile(
            `Base { color: "blue" }`,
            { 'Base.exon': `{ color: "red" size: 10 }` }
        );
        expect(result).toEqual({ color: 'blue', size: 10 });
    });

    it('overrides a parent property with null', () => {
        const result = compile(
            `Base { color: null }`,
            { 'Base.exon': `{ color: "red" }` }
        );
        expect(result).toEqual({ color: null });
    });

    it('resolves multi-level inheritance', () => {
        const result = compile(
            `Child { z: 3 }`,
            {
                'Child.exon': `Parent { y: 2 }`,
                'Parent.exon': `{ x: 1 }`,
            }
        );
        expect(result).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('child property overrides grandparent property', () => {
        const result = compile(
            `Child { x: 99 }`,
            {
                'Child.exon': `Parent { }`,
                'Parent.exon': `{ x: 1 }`,
            }
        );
        expect(result).toEqual({ x: 99 });
    });
});

// ---------------------------------------------------------------------------
// Partial override (_)
// ---------------------------------------------------------------------------

describe('partial override (_)', () => {
    it('merges specific keys into a parent object property', () => {
        const result = compile(
            `Base { cfg: * { timeout: 999 } }`,
            { 'Base.exon': `{ cfg: { timeout: 1 retries: 3 } }` }
        );
        expect(result).toEqual({ cfg: { timeout: 999, retries: 3 } });
    });

    it('adds a new key via partial override', () => {
        const result = compile(
            `Base { cfg: * { extra: "hi" } }`,
            { 'Base.exon': `{ cfg: { a: 1 } }` }
        );
        expect(result).toEqual({ cfg: { a: 1, extra: 'hi' } });
    });
});

// ---------------------------------------------------------------------------
// File imports (dotted paths)
// ---------------------------------------------------------------------------

describe('file imports', () => {
    it('resolves a sub-directory import using dot notation', () => {
        const result = compile(
            `sub.Widget { label: "test" }`,
            { 'sub/Widget.exon': `{ label: "" color: "white" }` }
        );
        expect(result).toEqual({ label: 'test', color: 'white' });
    });

    it('resolves a deeply nested dotted import', () => {
        const result = compile(
            `a.b.c.Item { }`,
            { 'a/b/c/Item.exon': `{ val: 42 }` }
        );
        expect(result).toEqual({ val: 42 });
    });
});

// ---------------------------------------------------------------------------
// fn.map
// ---------------------------------------------------------------------------

describe('fn.map', () => {
    it('builds an object from parallel keys and values arrays', () => {
        const result = compile(`{
            m: fn.map {
                keys: ["a", "b", "c"]
                values: [1, 2, 3]
            }
        }`);
        expect(result).toEqual({ m: { a: 1, b: 2, c: 3 } });
    });

    it('produces an empty object for empty arrays', () => {
        const result = compile(`{
            m: fn.map { keys: [] values: [] }
        }`);
        expect(result).toEqual({ m: {} });
    });
});

// ---------------------------------------------------------------------------
// fn.json.decode
// ---------------------------------------------------------------------------

describe('fn.json.decode', () => {
    it('substitutes string variable into a JSON template', () => {
        const result = compile(`{
            out: fn.json.decode {
                content: "{\\"name\\": \\"$name\\"}"
                name: "alice"
            }
        }`);
        expect(result).toEqual({ out: { name: 'alice' } });
    });

    it('substitutes numeric variable', () => {
        const result = compile(`{
            out: fn.json.decode {
                content: "{\\"x\\": $x}"
                x: 99
            }
        }`);
        expect(result).toEqual({ out: { x: 99 } });
    });

    it('substitutes multiple variables', () => {
        const result = compile(`{
            out: fn.json.decode {
                content: "{\\"a\\": $a, \\"b\\": $b}"
                a: 1
                b: 2
            }
        }`);
        expect(result).toEqual({ out: { a: 1, b: 2 } });
    });
});

// ---------------------------------------------------------------------------
// fn.merge
// ---------------------------------------------------------------------------

describe('fn.merge', () => {
    it('merges two objects, last wins on conflict', () => {
        const result = compile(`{
            merged: fn.merge {
                { a: 1 b: 2 }
                { b: 99 c: 3 }
            }
        }`);
        expect(result).toEqual({ merged: { a: 1, b: 99, c: 3 } });
    });

    it('merges three objects', () => {
        const result = compile(`{
            merged: fn.merge {
                { x: 1 }
                { y: 2 }
                { z: 3 }
            }
        }`);
        expect(result).toEqual({ merged: { x: 1, y: 2, z: 3 } });
    });
});

// ---------------------------------------------------------------------------
// fn.process.env
// ---------------------------------------------------------------------------

describe('fn.process.env', () => {
    it('reads a set environment variable', () => {
        process.env['EXON_TEST_VAR'] = 'hello';
        const result = compile(`{
            v: fn.process.env { "EXON_TEST_VAR" }
        }`);
        expect(result).toEqual({ v: 'hello' });
        delete process.env['EXON_TEST_VAR'];
    });

    it('returns null for an unset variable', () => {
        delete process.env['EXON_UNSET_VAR'];
        const result = compile(`{
            v: fn.process.env { "EXON_UNSET_VAR" }
        }`);
        expect(result).toEqual({ v: null });
    });
});

// ---------------------------------------------------------------------------
// fn.eq / fn.ne
// ---------------------------------------------------------------------------

describe('fn.eq', () => {
    it('returns true when left equals right', () => {
        const result = compile(`{
            r: fn.eq { 1 1 }
        }`);
        expect(result).toEqual({ r: true });
    });

    it('returns false when left differs from right', () => {
        const result = compile(`{
            r: fn.eq { 1 2 }
        }`);
        expect(result).toEqual({ r: false });
    });

    it('compares strings', () => {
        const result = compile(`{
            r: fn.eq { "a" "a" }
        }`);
        expect(result).toEqual({ r: true });
    });
});

describe('fn.ne', () => {
    it('returns true when values differ', () => {
        const result = compile(`{
            r: fn.ne { 1 2 }
        }`);
        expect(result).toEqual({ r: true });
    });

    it('returns false when values are equal', () => {
        const result = compile(`{
            r: fn.ne { "x" "x" }
        }`);
        expect(result).toEqual({ r: false });
    });
});

// ---------------------------------------------------------------------------
// fn.or / fn.and
// ---------------------------------------------------------------------------

describe('fn.or', () => {
    it('returns true when any condition is true', () => {
        const result = compile(`{
            r: fn.or { false true }
        }`);
        expect(result).toEqual({ r: true });
    });

    it('returns false when all conditions are false', () => {
        const result = compile(`{
            r: fn.or { false false false }
        }`);
        expect(result).toEqual({ r: false });
    });
});

describe('fn.and', () => {
    it('returns true when all conditions are true', () => {
        const result = compile(`{
            r: fn.and { true true true }
        }`);
        expect(result).toEqual({ r: true });
    });

    it('returns false when any condition is false', () => {
        const result = compile(`{
            r: fn.and { true false true }
        }`);
        expect(result).toEqual({ r: false });
    });
});

// ---------------------------------------------------------------------------
// fn.if
// ---------------------------------------------------------------------------

describe('fn.if', () => {
    it('returns then-branch when condition is true', () => {
        const result = compile(`{
            r: fn.if { condition: true then: "yes" else: "no" }
        }`);
        expect(result).toEqual({ r: 'yes' });
    });

    it('returns else-branch when condition is false', () => {
        const result = compile(`{
            r: fn.if { condition: false then: "yes" else: "no" }
        }`);
        expect(result).toEqual({ r: 'no' });
    });

    it('returns null when condition is false and no else is provided', () => {
        const result = compile(`{
            r: fn.if { condition: false then: "yes" }
        }`);
        expect(result).toEqual({ r: null });
    });

    it('works with a computed condition', () => {
        const result = compile(`{
            r: fn.if {
                condition: fn.eq { 2 2 }
                then: "equal"
                else: "not equal"
            }
        }`);
        expect(result).toEqual({ r: 'equal' });
    });
});

// ---------------------------------------------------------------------------
// @id bindings
// ---------------------------------------------------------------------------

describe('id bindings (@id)', () => {
    it('sets __id__ on the object but strips it from output', () => {
        const result = compile(`Object@myRoot { x: 1 }`);
        expect(result.x).toBe(1);
        expect(result.__id__).toBeUndefined();
    });

    it('binds a property from a parent id', () => {
        const result = compile(`{
            color: "blue"
            child: { color: @root.color }
        }`);
        expect(result).toEqual({ color: 'blue', child: { color: 'blue' } });
    });

    it('binds a property from a sibling defined earlier', () => {
        const result = compile(`{
            a: Object@first { val: 10 }
            b: { val: @first.val }
        }`);
        expect(result.b.val).toBe(10);
    });

    it('chains bindings across siblings', () => {
        const result = compile(`{
            color: "red"
            h1: Object@header { color: @root.color }
            h2: { color: @header.color }
        }`);
        expect(result.h1.color).toBe('red');
        expect(result.h2.color).toBe('red');
    });

    it('resolves @id without a property path (whole object)', () => {
        const result = compile(`{
            inner: Object@box { x: 5 }
            ref: @box
        }`);
        expect(result.ref).toEqual({ x: 5 });
    });
});

// ---------------------------------------------------------------------------
// Binding scoping (file-local)
// ---------------------------------------------------------------------------

describe('binding scoping', () => {
    it('does not expose ids from an imported file to the importer', () => {
        expect(() =>
            compile(
                `Lib { extra: @libRoot.color }`,
                { 'Lib.exon': `Object@libRoot { color: "blue" }` }
            )
        ).toThrow('Unknown id reference: @libRoot');
    });

    it('imported file internal bindings still work', () => {
        const result = compile(
            `Lib { }`,
            {
                'Lib.exon': `{
                    color: "green"
                    child: { color: @root.color }
                }`,
            }
        );
        expect(result.child.color).toBe('green');
    });

    it('implicit @root in two different files does not conflict', () => {
        const result = compile(
            `{
                page: Lib { }
                name: "importer"
                self_ref: @root.name
            }`,
            { 'Lib.exon': `{ name: "library" self_ref: @root.name }` }
        );
        expect(result.name).toBe('importer');
        expect(result.self_ref).toBe('importer');
        expect(result.page.name).toBe('library');
        expect(result.page.self_ref).toBe('library');
    });
});
