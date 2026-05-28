import { describe, it, expect } from 'vitest';
import { compile } from './helpers';

// A file-based wrapper setter. Uses @root.target to reach the property
// object and @root.value for the value being assigned. This pattern
// triggered "Unknown id reference: @root" before the bindRaw __base__
// fix (property.ts) and produced wrong results before the resolveBindingImpl
// __preresolved__ fix (Resolver.ts).
const SETTER_EXON = `
using fn.*

wrapper {
    target: null
    property: ""
    value: 0

    content: set {
        target: @root.target
        property: "_value"
        value: @root.value
    }
}
`;

// Same as above but clamps the value using a 3-part binding chain:
// @root.target.min / @root.target.max. This specifically exercises the
// resolveBindingImpl fix that unwraps __preresolved__ between chain steps.
const SETTER_CLAMP_EXON = `
using fn.*

wrapper {
    target: null
    property: ""
    value: 0

    content: set {
        target: @root.target
        property: "_value"
        value: math.clamp { @root.value; @root.target.min; @root.target.max }
    }
}
`;

// A number property whose set block is a file-based wrapper type.
const NUMPROP_EXON = (setterName: string) => `
using fn.*

property {
    _value: 0

    get: get {
        target: @root
        property: "_value"
    }

    set: ${setterName} {
        target: @root
        property: "_value"
        value: parameter{}
    }
}
`;

// A clamped number property. The setter wrapper accesses min/max via
// @root.target.min and @root.target.max (3-part binding chain).
const NUMPROP_CLAMP_EXON = `
using fn.*

property {
    min: 0
    max: 100
    _value: 0

    get: get {
        target: @root
        property: "_value"
    }

    set: SetterClamp {
        target: @root
        property: "_value"
        value: parameter{}
    }
}
`;

// A container whose "value" field is a NumProp, so we can trigger the
// property setter by writing: Container { value: <number> }
const CONTAINER_EXON = (propName: string) => `
using fn.*
{ value: ${propName} {} }
`;

function makeFiles(setterExon: string, numPropExon: string, containerExon: string): Record<string, string> {
    return {
        'Setter.exon': setterExon,
        'NumProp.exon': numPropExon,
        'Container.exon': containerExon,
    };
}

function resolve(result: any): any {
    return JSON.parse(JSON.stringify(result));
}

describe('property with file-based wrapper setter', () => {
    const files = makeFiles(SETTER_EXON, NUMPROP_EXON('Setter'), CONTAINER_EXON('NumProp'));

    it('constructs without error', () => {
        expect(() => compile(
            `using fn.*\n{ a: Container {} }`,
            files
        )).not.toThrow();
    });

    it('getter returns default initial value', () => {
        const result = resolve(compile(
            `using fn.*\n{ a: Container {} }`,
            files
        ));
        expect(result.a.value).toBe(0);
    });

    it('setter applies value via @root.target traversal', () => {
        const result = resolve(compile(
            `using fn.*\n{ a: Container {}; b: Container { value: 42 } }`,
            files
        ));
        expect(result.a.value).toBe(0);
        expect(result.b.value).toBe(42);
    });

    it('multiple instances have independent backing values', () => {
        const result = resolve(compile(
            `using fn.*\n{ a: Container { value: 1 }; b: Container { value: 2 }; c: Container { value: 3 } }`,
            files
        ));
        expect(result.a.value).toBe(1);
        expect(result.b.value).toBe(2);
        expect(result.c.value).toBe(3);
    });
});

describe('property with file-based clamping setter (3-part @root.target.min/max chain)', () => {
    const files = {
        'SetterClamp.exon': SETTER_CLAMP_EXON,
        'NumProp.exon': NUMPROP_CLAMP_EXON,
        'Container.exon': CONTAINER_EXON('NumProp'),
    };

    it('constructs without error', () => {
        expect(() => compile(
            `using fn.*\n{ a: Container {} }`,
            files
        )).not.toThrow();
    });

    it('value within range is stored unchanged', () => {
        const result = resolve(compile(
            `using fn.*\n{ a: Container { value: 50 } }`,
            files
        ));
        expect(result.a.value).toBe(50);
    });

    it('value below min is clamped to min', () => {
        const result = resolve(compile(
            `using fn.*\n{ a: Container { value: -20 } }`,
            files
        ));
        expect(result.a.value).toBe(0);
    });

    it('value above max is clamped to max', () => {
        const result = resolve(compile(
            `using fn.*\n{ a: Container { value: 150 } }`,
            files
        ));
        expect(result.a.value).toBe(100);
    });

    it('multiple instances clamp independently', () => {
        const result = resolve(compile(
            `using fn.*\n{ a: Container { value: -10 }; b: Container { value: 50 }; c: Container { value: 200 } }`,
            files
        ));
        expect(result.a.value).toBe(0);
        expect(result.b.value).toBe(50);
        expect(result.c.value).toBe(100);
    });
});
