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

describe('fn.classname (native components)', () => {
    it('returns the component name for fn.add', () => {
        expect(compile(`{ r: fn.classname { fn.add { 1 2 } } }`)).toEqual({ r: 'fn.add' });
    });

    it('returns the component name for fn.count', () => {
        expect(compile(`{ r: fn.classname { fn.count { [1, 2, 3] } } }`)).toEqual({ r: 'fn.count' });
    });
});

// ---------------------------------------------------------------------------
// User-defined types (A, B, C)
// ---------------------------------------------------------------------------

describe('fn.classname (user-defined types)', () => {
    it('returns "A" for a direct instance of A', () => {
        const result = compile(`{ r: fn.classname { A { } } }`, hierarchy);
        expect(result.r).toBe('A');
    });

    it('returns "B" for a direct instance of B (which extends A)', () => {
        const result = compile(`{ r: fn.classname { B { } } }`, hierarchy);
        expect(result.r).toBe('B');
    });

    it('returns "C" for a direct instance of C (which extends B extends A)', () => {
        const result = compile(`{ r: fn.classname { C { } } }`, hierarchy);
        expect(result.r).toBe('C');
    });

    it('returns the declared type, not the root ancestor', () => {
        const r_b = compile(`{ r: fn.classname { B { } } }`, hierarchy).r;
        const r_c = compile(`{ r: fn.classname { C { } } }`, hierarchy).r;
        expect(r_b).not.toBe('A');
        expect(r_c).not.toBe('A');
        expect(r_c).not.toBe('B');
    });
});

// ---------------------------------------------------------------------------
// Primitives and plain objects return null
// ---------------------------------------------------------------------------

describe('fn.classname (primitives)', () => {
    it('returns null for a plain string', () => {
        expect(compile(`{ r: fn.classname { "hello" } }`)).toEqual({ r: null });
    });

    it('returns null for a number', () => {
        expect(compile(`{ r: fn.classname { 42 } }`)).toEqual({ r: null });
    });

    it('returns null for an array', () => {
        expect(compile(`{ r: fn.classname { [1, 2, 3] } }`)).toEqual({ r: null });
    });

    it('returns null for a plain inline object', () => {
        expect(compile(`{ r: fn.classname { { x: 1 } } }`)).toEqual({ r: null });
    });
});

// ---------------------------------------------------------------------------
// Argument validation
// ---------------------------------------------------------------------------

describe('fn.classname (validation)', () => {
    it('throws when given no arguments', () => {
        expect(() => compile(`{ r: fn.classname { } }`)).toThrow();
    });

    it('throws when given more than one argument', () => {
        expect(() => compile(`{ r: fn.classname { fn.add { 1 2 } fn.count { [] } } }`)).toThrow();
    });
});
