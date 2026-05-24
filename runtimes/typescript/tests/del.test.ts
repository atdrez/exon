import { describe, it, expect } from 'vitest';
import { compile } from './helpers';

// ---------------------------------------------------------------------------
// fn.del -- object property deletion
// ---------------------------------------------------------------------------

describe('fn.del (object property)', () => {
    it('removes an existing property', () => {
        const result = compile(`{
            data: { a: 1 b: 2 c: 3 }
            _: fn.del { target: @root.data property: "b" }
        }`);
        expect(result.data).toEqual({ a: 1, c: 3 });
        expect(result.data).not.toHaveProperty('b');
    });

    it('removes a top-level property from root', () => {
        const result = compile(`{
            keep: 42
            drop: "bye"
            _: fn.del { target: @root property: "drop" }
        }`);
        expect(result).toHaveProperty('keep', 42);
        expect(result).not.toHaveProperty('drop');
    });

    it('is a no-op when the property does not exist', () => {
        const result = compile(`{
            data: { x: 10 }
            _: fn.del { target: @root.data property: "missing" }
        }`);
        expect(result.data).toEqual({ x: 10 });
    });

    it('throws when target is not an object', () => {
        expect(() => compile(`{
            _: fn.del { target: "hello" property: "a" }
        }`)).toThrow();
    });

    it('throws when target is an array', () => {
        expect(() => compile(`{
            _: fn.del { target: [1, 2] property: "a" }
        }`)).toThrow();
    });

    it('throws when property is not a string', () => {
        expect(() => compile(`{
            _: fn.del { target: @root property: 42 }
        }`)).toThrow();
    });
});

// ---------------------------------------------------------------------------
// fn.del -- array element deletion
// ---------------------------------------------------------------------------

describe('fn.del (array element)', () => {
    it('removes an element at the given index', () => {
        const result = compile(`{
            data: [10, 20, 30]
            _: fn.del { target: @root property: "data" index: 1 }
        }`);
        expect(result.data).toEqual([10, 30]);
    });

    it('removes the first element', () => {
        const result = compile(`{
            data: [1, 2, 3]
            _: fn.del { target: @root property: "data" index: 0 }
        }`);
        expect(result.data).toEqual([2, 3]);
    });

    it('removes the last element', () => {
        const result = compile(`{
            data: [1, 2, 3]
            _: fn.del { target: @root property: "data" index: 2 }
        }`);
        expect(result.data).toEqual([1, 2]);
    });

    it('throws when the named property is not an array', () => {
        expect(() => compile(`{
            data: { a: 1 }
            _: fn.del { target: @root property: "data" index: 0 }
        }`)).toThrow();
    });

    it('throws when index is not a number', () => {
        expect(() => compile(`{
            data: [1, 2, 3]
            _: fn.del { target: @root property: "data" index: "0" }
        }`)).toThrow();
    });
});
