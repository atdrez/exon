import { describe, it, expect } from 'vitest';
import { compile } from './helpers';

// Custom type hierarchy used across tests:
//   A  <-  B  <-  C
const A_exon = `{ value: 0 }`;
const B_exon = `A { value: 1 }`;
const C_exon = `B { value: 2 }`;
const hierarchy = { 'A.exon': A_exon, 'B.exon': B_exon, 'C.exon': C_exon };

// ---------------------------------------------------------------------------
// Native fn.* components
// ---------------------------------------------------------------------------

describe('fn.instanceof (native components)', () => {
    it('returns true when native type matches', () => {
        expect(compile(`{ r: fn.instanceof { fn.add { 1 2 } "fn.add" } }`)).toEqual({ r: true });
    });

    it('returns false when native type does not match', () => {
        expect(compile(`{ r: fn.instanceof { fn.add { 1 2 } "fn.count" } }`)).toEqual({ r: false });
    });
});

// ---------------------------------------------------------------------------
// User-defined types -- direct match
// ---------------------------------------------------------------------------

describe('fn.instanceof (direct type match)', () => {
    it('returns true for A instance vs "A"', () => {
        expect(compile(`{ r: fn.instanceof { A { } "A" } }`, hierarchy)).toEqual({ r: true });
    });

    it('returns true for B instance vs "B"', () => {
        expect(compile(`{ r: fn.instanceof { B { } "B" } }`, hierarchy)).toEqual({ r: true });
    });

    it('returns true for C instance vs "C"', () => {
        expect(compile(`{ r: fn.instanceof { C { } "C" } }`, hierarchy)).toEqual({ r: true });
    });
});

// ---------------------------------------------------------------------------
// User-defined types -- parent chain
// ---------------------------------------------------------------------------

describe('fn.instanceof (parent chain)', () => {
    it('returns true for B instance vs "A" (B extends A)', () => {
        expect(compile(`{ r: fn.instanceof { B { } "A" } }`, hierarchy)).toEqual({ r: true });
    });

    it('returns true for C instance vs "B" (C extends B)', () => {
        expect(compile(`{ r: fn.instanceof { C { } "B" } }`, hierarchy)).toEqual({ r: true });
    });

    it('returns true for C instance vs "A" (C extends B extends A)', () => {
        expect(compile(`{ r: fn.instanceof { C { } "A" } }`, hierarchy)).toEqual({ r: true });
    });

    it('returns false for A instance vs "B"', () => {
        expect(compile(`{ r: fn.instanceof { A { } "B" } }`, hierarchy)).toEqual({ r: false });
    });

    it('returns false for B instance vs "C"', () => {
        expect(compile(`{ r: fn.instanceof { B { } "C" } }`, hierarchy)).toEqual({ r: false });
    });

    it('returns false for A instance vs "C"', () => {
        expect(compile(`{ r: fn.instanceof { A { } "C" } }`, hierarchy)).toEqual({ r: false });
    });
});

// ---------------------------------------------------------------------------
// Primitives return false
// ---------------------------------------------------------------------------

describe('fn.instanceof (primitives)', () => {
    it('returns false for a string', () => {
        expect(compile(`{ r: fn.instanceof { "hello" "string" } }`)).toEqual({ r: false });
    });

    it('returns false for a number', () => {
        expect(compile(`{ r: fn.instanceof { 42 "number" } }`)).toEqual({ r: false });
    });

    it('returns false for a plain inline object', () => {
        expect(compile(`{ r: fn.instanceof { { x: 1 } "object" } }`)).toEqual({ r: false });
    });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('fn.instanceof (validation)', () => {
    it('throws when given only one argument', () => {
        expect(() => compile(`{ r: fn.instanceof { fn.add { 1 2 } } }`)).toThrow();
    });

    it('throws when second argument is not a string', () => {
        expect(() => compile(`{ r: fn.instanceof { fn.add { 1 2 } 42 } }`)).toThrow();
    });
});
