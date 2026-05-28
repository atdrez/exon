import { describe, it, expect } from 'vitest';
import { compileAt } from './helpers';

const STRING_PROP = `
using fn.*

property {
    _value: ""

    get: get {
        target: @root
        property: "_value"
    }

    set: set {
        target: @root
        property: "_value"
        value: sequence {
            assert {
                string.is { parameter{} }
                message: "must be string"
            }
            parameter{}
        }
    }

    init: set {
        target: @root
        property: "_value"
        value: sequence {
            assert {
                string.is { parameter{} }
                message: "must be string"
            }
            parameter{}
        }
    }
}
`;

const STRING_PROP_NO_INIT = `
using fn.*

property {
    _value: ""

    get: get {
        target: @root
        property: "_value"
    }

    set: set {
        target: @root
        property: "_value"
        value: sequence {
            assert {
                string.is { parameter{} }
                message: "must be string"
            }
            parameter{}
        }
    }
}
`;

describe('fn.property init delegate', () => {
    it('throws when initial _value fails init validation', () => {
        expect(() => compileAt('a/b', `
using fn.*
{ p: ...MyProp { _value: 10 } }
`, { 'MyProp.exon': STRING_PROP })).toThrow();
    });

    it('does not throw when initial _value passes init validation', () => {
        expect(() => compileAt('a/b', `
using fn.*
{ p: ...MyProp { _value: "hello" } }
`, { 'MyProp.exon': STRING_PROP })).not.toThrow();
    });

    it('does not throw when no _value override is given', () => {
        expect(() => compileAt('a/b', `
using fn.*
{ p: ...MyProp { } }
`, { 'MyProp.exon': STRING_PROP })).not.toThrow();
    });

    it('without init, invalid initial _value is silently accepted', () => {
        expect(() => compileAt('a/b', `
using fn.*
{ p: ...MyProp { _value: 10 } }
`, { 'MyProp.exon': STRING_PROP_NO_INIT })).not.toThrow();
    });
});
