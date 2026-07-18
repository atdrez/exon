import { describe, it, expect } from 'vitest';
import { compile, describeExonFile } from './helpers';
import { Closure } from '../src/fn/lang/closure';

// ---------------------------------------------------------------------------
// Exon fixture tests (embedded __tests__ block)
// ---------------------------------------------------------------------------

describeExonFile('closure.test.exon');

// ---------------------------------------------------------------------------
// fn.closure - basic call
// ---------------------------------------------------------------------------

describe('fn.closure - basic call', () => {
    it('returns the body value when called with no args', () => {
        const result = compile(`fn.sequence {
            fn.closure@f { fn.sequence { 42 } }
            fn.call { @f }
        }`);
        expect(result).toBe(42);
    });

    it('returns a string from the closure body', () => {
        const result = compile(`fn.sequence {
            fn.closure@f { fn.string.join { "hello" } }
            fn.call { @f }
        }`);
        expect(result).toBe('hello');
    });

    it('returns null when the body produces null', () => {
        const result = compile(`fn.sequence {
            fn.closure@f { fn.if { condition: false  then: 1 } }
            fn.call { @f }
        }`);
        expect(result).toBeNull();
    });

    it('resolves a computed body expression', () => {
        const result = compile(`fn.sequence {
            fn.closure@f { fn.add { 3 4 } }
            fn.call { @f }
        }`);
        expect(result).toBe(7);
    });
});

// ---------------------------------------------------------------------------
// fn.closure - named parameters
// ---------------------------------------------------------------------------

describe('fn.closure - named parameters', () => {
    it('receives a named numeric parameter', () => {
        const result = compile(`fn.sequence {
            fn.closure@f { fn.add { fn.parameter{"n"} 5 } }
            fn.call { @f  n: 10 }
        }`);
        expect(result).toBe(15);
    });

    it('receives a named string parameter', () => {
        const result = compile(`fn.sequence {
            fn.closure@f { fn.parameter{"msg"} }
            fn.call { @f  msg: "world" }
        }`);
        expect(result).toBe('world');
    });

    it('receives multiple named parameters', () => {
        const result = compile(`fn.sequence {
            fn.closure@f { fn.add { fn.parameter{"a"} fn.parameter{"b"} } }
            fn.call { @f  a: 3  b: 7 }
        }`);
        expect(result).toBe(10);
    });

    it('can be called multiple times with different args', () => {
        const result = compile(`fn.sequence {
            fn.closure@f { fn.mul { fn.parameter{"n"} 2 } }
            { r1: fn.call { @f  n: 5 }  r2: fn.call { @f  n: 8 } }
        }`);
        expect(result.r1).toBe(10);
        expect(result.r2).toBe(16);
    });

    it('missing parameter resolves to undefined', () => {
        const result = compile(`fn.sequence {
            fn.closure@f { fn.parameter{"missing"} }
            fn.call { @f }
        }`);
        expect(result).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// fn.closure - scope capture
// ---------------------------------------------------------------------------

describe('fn.closure - scope capture', () => {
    it('captures a literal value from scope at definition time', () => {
        const result = compile(`fn.sequence {
            fn.closure@f {
                offset: 50
                fn.add { @offset fn.parameter{"n"} }
            }
            fn.call { @f  n: 3 }
        }`);
        expect(result).toBe(53);
    });

    it('captures a computed expression value', () => {
        const result = compile(`fn.sequence {
            fn.closure@f {
                base: fn.mul { 3 4 }
                fn.add { @base fn.parameter{"n"} }
            }
            fn.call { @f  n: 2 }
        }`);
        expect(result).toBe(14);
    });

    it('captures multiple scope values independently', () => {
        const result = compile(`fn.sequence {
            fn.closure@f {
                a: 10
                b: 20
                fn.add { @a @b }
            }
            fn.call { @f }
        }`);
        expect(result).toBe(30);
    });
});

// ---------------------------------------------------------------------------
// fn.closure - scope + parameter combined
// ---------------------------------------------------------------------------

describe('fn.closure - scope and parameter combined', () => {
    it('uses both captured scope and a named parameter', () => {
        const result = compile(`fn.sequence {
            fn.closure@greet {
                salutation: "Hello"
                fn.string.join { @salutation fn.parameter{"name"}  separator: ", " }
            }
            fn.call { @greet  name: "World" }
        }`);
        expect(result).toBe('Hello, World');
    });

    it('scope and parameter are independent across multiple calls', () => {
        const result = compile(`fn.sequence {
            fn.closure@f {
                offset: 100
                fn.add { @offset fn.parameter{"n"} }
            }
            { r1: fn.call { @f  n: 1 }  r2: fn.call { @f  n: 2 } }
        }`);
        expect(result.r1).toBe(101);
        expect(result.r2).toBe(102);
    });
});

// ---------------------------------------------------------------------------
// fn.closure - higher-order: closure capturing another closure
// ---------------------------------------------------------------------------

describe('fn.closure - higher-order', () => {
    it('captures another closure reference and delegates to it', () => {
        const result = compile(`fn.sequence {
            fn.closure@double { fn.mul { fn.parameter{"n"} 2 } }
            fn.closure@apply {
                fn: @double
                fn.call { @fn  n: fn.parameter{"n"} }
            }
            fn.call { @apply  n: 6 }
        }`);
        expect(result).toBe(12);
    });
});

// ---------------------------------------------------------------------------
// fn.closure - recursion via @root
// ---------------------------------------------------------------------------

describe('fn.closure - recursion via @root', () => {
    const factorialCode = `fn.closure@fact {
        fn.sequence {
            fn.parameter@n{"n"}
            fn.cond {
                fn.le { @n 1 }  1
                fn.mul { @n  fn.call { @root  n: fn.sub { @n 1 } } }
            }
        }
    }`;

    it('computes factorial(1) = 1 via @root self-reference', () => {
        const result = compile(`fn.sequence { ${factorialCode} fn.call { @fact  n: 1 } }`);
        expect(result).toBe(1);
    });

    it('computes factorial(5) = 120 via @root self-reference', () => {
        const result = compile(`fn.sequence { ${factorialCode} fn.call { @fact  n: 5 } }`);
        expect(result).toBe(120);
    });
});

// ---------------------------------------------------------------------------
// fn.closure - the Closure instance itself
// ---------------------------------------------------------------------------

describe('fn.closure - instance type', () => {
    it('binding to a closure resolves to a Closure instance', () => {
        const result = compile(`fn.sequence {
            fn.closure@f { fn.sequence { 1 } }
            @f
        }`);
        expect(result).toBeInstanceOf(Closure);
    });
});

// ---------------------------------------------------------------------------
// fn.closure - error cases
// ---------------------------------------------------------------------------

describe('fn.closure - error cases', () => {
    it('throws when closure body is empty (no content items)', () => {
        expect(() => compile(`fn.sequence {
            fn.closure@f { }
            fn.call { @f }
        }`)).toThrow();
    });

    it('throws when closure body has more than one content item', () => {
        expect(() => compile(`fn.sequence {
            fn.closure@f { fn.sequence { 1 }  fn.sequence { 2 } }
            fn.call { @f }
        }`)).toThrow();
    });

    it('throws when fn.call target resolves to a non-Closure value', () => {
        expect(() => compile(`fn.sequence {
            fn.call { fn.sequence { 42 } }
        }`)).toThrow();
    });

    it('throws when fn.call has no target', () => {
        expect(() => compile(`fn.sequence {
            fn.call { }
        }`)).toThrow();
    });
});
