import { describe, it, expect } from 'vitest';
import { compile } from './helpers';

// ---------------------------------------------------------------------------
// fn.mod
// ---------------------------------------------------------------------------

describe('fn.mod', () => {
    it('returns remainder of integer division', () => {
        expect(compile(`{ r: fn.mod { 10 3 } }`)).toEqual({ r: 1 });
    });

    it('returns 0 when evenly divisible', () => {
        expect(compile(`{ r: fn.mod { 9 3 } }`)).toEqual({ r: 0 });
    });

    it('works with floats', () => {
        expect(compile(`{ r: fn.mod { 5.5 2 } }`)).toEqual({ r: 1.5 });
    });
});

// ---------------------------------------------------------------------------
// fn.pow
// ---------------------------------------------------------------------------

describe('fn.pow', () => {
    it('raises left to the power of right', () => {
        expect(compile(`{ r: fn.pow { 2 10 } }`)).toEqual({ r: 1024 });
    });

    it('returns 1 for exponent 0', () => {
        expect(compile(`{ r: fn.pow { 5 0 } }`)).toEqual({ r: 1 });
    });

    it('handles fractional exponents', () => {
        expect(compile(`{ r: fn.pow { 4 0.5 } }`)).toEqual({ r: 2 });
    });
});

// ---------------------------------------------------------------------------
// fn.xor
// ---------------------------------------------------------------------------

describe('fn.xor', () => {
    it('returns true when operands differ', () => {
        expect(compile(`{ r: fn.xor { true false } }`)).toEqual({ r: true });
    });

    it('returns false when both are true', () => {
        expect(compile(`{ r: fn.xor { true true } }`)).toEqual({ r: false });
    });

    it('returns false when both are false', () => {
        expect(compile(`{ r: fn.xor { false false } }`)).toEqual({ r: false });
    });
});

// ---------------------------------------------------------------------------
// fn.neg
// ---------------------------------------------------------------------------

describe('fn.neg', () => {
    it('negates a positive number', () => {
        expect(compile(`{ r: fn.neg { 5 } }`)).toEqual({ r: -5 });
    });

    it('negates a negative number back to positive', () => {
        expect(compile(`{ r: fn.neg { -3 } }`)).toEqual({ r: 3 });
    });

    it('negates zero', () => {
        expect(compile(`{ r: fn.neg { 0 } }`)).toEqual({ r: -0 });
    });
});

// ---------------------------------------------------------------------------
// fn.defined
// ---------------------------------------------------------------------------

describe('fn.defined', () => {
    it('returns true for a string', () => {
        expect(compile(`{ r: fn.defined { "hello" } }`)).toEqual({ r: true });
    });

    it('returns true for a number', () => {
        expect(compile(`{ r: fn.defined { 42 } }`)).toEqual({ r: true });
    });

    it('returns true for false (defined but falsy)', () => {
        expect(compile(`{ r: fn.defined { false } }`)).toEqual({ r: true });
    });

    it('returns true for 0 (defined but falsy)', () => {
        expect(compile(`{ r: fn.defined { 0 } }`)).toEqual({ r: true });
    });

    it('returns false for null', () => {
        expect(compile(`{ r: fn.defined { null } }`)).toEqual({ r: false });
    });
});

// ---------------------------------------------------------------------------
// fn.typeof
// ---------------------------------------------------------------------------

describe('fn.typeof', () => {
    it('returns "string" for a string value', () => {
        expect(compile(`{ r: fn.typeof { "hello" } }`)).toEqual({ r: 'string' });
    });

    it('returns "number" for an integer', () => {
        expect(compile(`{ r: fn.typeof { 42 } }`)).toEqual({ r: 'number' });
    });

    it('returns "boolean" for true', () => {
        expect(compile(`{ r: fn.typeof { true } }`)).toEqual({ r: 'boolean' });
    });

    it('returns "null" for null', () => {
        expect(compile(`{ r: fn.typeof { null } }`)).toEqual({ r: 'null' });
    });

    it('returns "array" for an array', () => {
        expect(compile(`{ r: fn.typeof { [1, 2, 3] } }`)).toEqual({ r: 'array' });
    });

    it('returns "object" for an inline object', () => {
        expect(compile(`{ r: fn.typeof { { x: 1 } } }`)).toEqual({ r: 'object' });
    });
});

// ---------------------------------------------------------------------------
// fn.in
// ---------------------------------------------------------------------------

describe('fn.in', () => {
    it('returns true when value is in array', () => {
        expect(compile(`{ r: fn.in { 2 [1, 2, 3] } }`)).toEqual({ r: true });
    });

    it('returns false when value is not in array', () => {
        expect(compile(`{ r: fn.in { 5 [1, 2, 3] } }`)).toEqual({ r: false });
    });

    it('returns true when key exists in object', () => {
        expect(compile(`{ r: fn.in { "a" { a: 1 b: 2 } } }`)).toEqual({ r: true });
    });

    it('returns false when key does not exist in object', () => {
        expect(compile(`{ r: fn.in { "z" { a: 1 b: 2 } } }`)).toEqual({ r: false });
    });

    it('returns true for string in array of strings', () => {
        expect(compile(`{ r: fn.in { "b" ["a", "b", "c"] } }`)).toEqual({ r: true });
    });
});

// ---------------------------------------------------------------------------
// fn.coalesce
// ---------------------------------------------------------------------------

describe('fn.coalesce', () => {
    it('returns first non-null value', () => {
        expect(compile(`{ r: fn.coalesce { null "fallback" } }`)).toEqual({ r: 'fallback' });
    });

    it('returns the first value when it is non-null', () => {
        expect(compile(`{ r: fn.coalesce { "first" "second" } }`)).toEqual({ r: 'first' });
    });

    it('skips multiple nulls to find first non-null', () => {
        expect(compile(`{ r: fn.coalesce { null null 42 } }`)).toEqual({ r: 42 });
    });

    it('returns null when all values are null', () => {
        expect(compile(`{ r: fn.coalesce { null null null } }`)).toEqual({ r: null });
    });

    it('treats false as a defined value (returns it)', () => {
        expect(compile(`{ r: fn.coalesce { null false "after" } }`)).toEqual({ r: false });
    });

    it('treats 0 as a defined value (returns it)', () => {
        expect(compile(`{ r: fn.coalesce { null 0 99 } }`)).toEqual({ r: 0 });
    });
});

// ---------------------------------------------------------------------------
// fn.cond
// ---------------------------------------------------------------------------

describe('fn.cond', () => {
    it('returns value for first matching condition', () => {
        expect(compile(`{ r: fn.cond { true "yes" false "no" } }`)).toEqual({ r: 'yes' });
    });

    it('falls through to second pair when first condition is false', () => {
        expect(compile(`{ r: fn.cond { false "no" true "yes" } }`)).toEqual({ r: 'yes' });
    });

    it('returns default (odd last item) when no condition matches', () => {
        expect(compile(`{ r: fn.cond { false "a" false "b" "default" } }`)).toEqual({ r: 'default' });
    });

    it('returns null when no condition matches and no default', () => {
        expect(compile(`{ r: fn.cond { false "a" false "b" } }`)).toEqual({ r: null });
    });

    it('works with computed conditions', () => {
        const result = compile(`{
            x: 5
            r: fn.cond {
                fn.gt { 5 10 } "big"
                fn.gt { 5 3 }  "medium"
                "small"
            }
        }`);
        expect(result.r).toBe('medium');
    });
});
