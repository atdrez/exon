import { describe, it, expect } from 'vitest';
import { compile, compileAt, withTempFile } from './helpers';
import { Parser } from '../src/Parser';
import { ScriptRepository } from '../src/ScriptRepository';
import * as Native from '../src/fn';

// ---------------------------------------------------------------------------
// fn.native { id, path } - explicit id: permanent, name-based registration
// ---------------------------------------------------------------------------

describe('fn.native: with explicit id', () => {
    it('registers the target module and resolves a bare reference to it', () => {
        const result = compile(`{ a: Base { } }`, {
            'Base.exon': `fn.native { id: "myNative" path: "./impl.js" }`,
            'impl.js': `module.exports.resolve = function(obj, context) { return { hello: "world" }; };`
        });
        expect(result).toEqual({ a: { hello: 'world' } });
    });

    it('resolving the fn.native{id,path} literal itself still goes through fn.native\'s own safe resolve(), not the target', () => {
        const result = compile(`fn.native { id: "topLevel" path: "./impl.js" }`, {
            'impl.js': `module.exports.resolve = function() { return { real: true }; };`
        });
        expect(result).toBeNull();
    });

    it('the same id reached via a bare name and via a relative alias both resolve to the one registration', () => {
        const result = compile(`{ a: Base { } b: sub.Wrapper { } }`, {
            'Base.exon': `fn.native { id: "myNative" path: "./impl.js" }`,
            'sub/Wrapper.exon': `..Base { }`,
            'impl.js': `module.exports.resolve = function(obj, context) { return { tag: "impl" }; };`
        });
        expect(result).toEqual({ a: { tag: 'impl' }, b: { tag: 'impl' } });
    });

    it('resolves identically regardless of which alias is parsed first', () => {
        const result = compile(`{ b: sub.Wrapper { } a: Base { } }`, {
            'Base.exon': `fn.native { id: "myNative" path: "./impl.js" }`,
            'sub/Wrapper.exon': `..Base { }`,
            'impl.js': `module.exports.resolve = function(obj, context) { return { tag: "impl" }; };`
        });
        expect(result).toEqual({ a: { tag: 'impl' }, b: { tag: 'impl' } });
    });

    it('propagates isDeferred from the target module, leaving children unresolved', () => {
        const result = compile(`{ a: Deferred { child: Throws { } } }`, {
            'Deferred.exon': `fn.native { id: "deferredThing" path: "./impl.js" }`,
            'Throws.exon': `fn.native { path: "./throws.js" }`,
            'throws.js': `module.exports.resolve = function() { throw new Error("should not be called"); };`,
            'impl.js': `
                module.exports.isDeferred = function() { return true; };
                module.exports.resolve = function(obj, context) { return { sawChild: obj.child !== undefined }; };
            `
        });
        expect(result).toEqual({ a: { sawChild: true } });
    });

    it('without isDeferred, children are eagerly resolved (and a throwing one propagates)', () => {
        expect(() => compile(`{ a: NotDeferred { child: Throws { } } }`, {
            'NotDeferred.exon': `fn.native { id: "notDeferredThing" path: "./impl.js" }`,
            'Throws.exon': `fn.native { path: "./throws.js" }`,
            'throws.js': `module.exports.resolve = function() { throw new Error("should not be called"); };`,
            'impl.js': `module.exports.resolve = function(obj, context) { return { sawChild: obj.child !== undefined }; };`
        })).toThrow(/should not be called/);
    });

    it('a plain reference to a self-registering fn.native{id,path} resolves via the clean direct match - path/id do not leak in', () => {
        const result = compile(`{ a: Base { } }`, {
            'Base.exon': `fn.native { id: "myNative" path: "./impl.js" }`,
            'impl.js': `module.exports.resolve = function(obj, context) { return { keys: Object.keys(obj).sort() }; };`
        });
        expect(result).toEqual({ a: { keys: [] } });
    });
});

// ---------------------------------------------------------------------------
// fn.native { path } - no id: hierarchy-respecting wrapper (like fn.wrapper)
// ---------------------------------------------------------------------------

describe('fn.native: without id (hierarchy pass-through)', () => {
    it('a bare fn.native{path} literal used directly delegates to the target module', () => {
        const result = compile(`fn.native { path: "./impl.js" }`, {
            'impl.js': `module.exports.resolve = function(obj) { return { direct: true, hasPath: 'path' in obj }; };`
        });
        expect(result).toEqual({ direct: true, hasPath: false });
    });

    it('one level of inheritance resolves through to the target module', () => {
        const result = compile(`{ a: Base { } }`, {
            'Base.exon': `fn.native { path: "./impl.js" }`,
            'impl.js': `module.exports.resolve = function(obj, context) { return { via: "impl" }; };`
        });
        expect(result).toEqual({ a: { via: 'impl' } });
    });

    it('two levels of inheritance (Mid extends Base extends fn.native) resolve through to the target module', () => {
        const result = compile(`{ a: Mid { } }`, {
            'Base.exon': `fn.native { path: "./impl.js" }`,
            'Mid.exon': `Base { }`,
            'impl.js': `module.exports.resolve = function(obj, context) { return { via: "impl" }; };`
        });
        expect(result).toEqual({ a: { via: 'impl' } });
    });

    it('two levels deep, an override made at the leaf still reaches the target module', () => {
        const result = compile(`{ a: Mid { extra: "leaf-value" } }`, {
            'Base.exon': `fn.native { path: "./impl.js" }`,
            'Mid.exon': `Base { }`,
            'impl.js': `module.exports.resolve = function(obj, context) { return { extra: obj.extra }; };`
        });
        expect(result).toEqual({ a: { extra: 'leaf-value' } });
    });

    it('does not require an id anywhere in a multi-level chain', () => {
        expect(() => compile(`{ a: Mid { } }`, {
            'Base.exon': `fn.native { path: "./impl.js" }`,
            'Mid.exon': `Base { }`,
            'impl.js': `module.exports.resolve = function() { return { ok: true }; };`
        })).not.toThrow();
    });

    it('two independent inheritors of the same id-less native resolve their own fields independently', () => {
        const result = compile(`{ a: Wrapper1 { } b: Wrapper2 { } }`, {
            'Base.exon': `fn.native { path: "./impl.js" }`,
            'Wrapper1.exon': `Base { tag: "one" }`,
            'Wrapper2.exon': `Base { tag: "two" }`,
            'impl.js': `module.exports.resolve = function(obj) { return { tag: obj.tag }; };`
        });
        expect(result).toEqual({ a: { tag: 'one' }, b: { tag: 'two' } });
    });

    it('does not leak the "path" bookkeeping field into the object seen by the target module', () => {
        const result = compile(`{ a: Base { extra: "keep-me" } }`, {
            'Base.exon': `fn.native { path: "./impl.js" }`,
            'impl.js': `module.exports.resolve = function(obj) { return { keys: Object.keys(obj).sort(), extra: obj.extra }; };`
        });
        expect(result).toEqual({ a: { keys: ['extra'], extra: 'keep-me' } });
    });

    it('resolves path relative to the declaring file\'s directory, not the inheriting file\'s directory', () => {
        const result = compileAt('sub', `..Base { }`, {
            'Base.exon': `fn.native { path: "./impl.js" }`,
            'impl.js': `module.exports.resolve = function() { return { from: "root" }; };`,
            'sub/impl.js': `module.exports.resolve = function() { return { from: "sub" }; };`
        });
        expect(result).toEqual({ from: 'root' });
    });
});

// ---------------------------------------------------------------------------
// Native module shape support (see loadNativeTarget in native.ts)
// ---------------------------------------------------------------------------

describe('fn.native: target module shape support', () => {
    it('supports a plain CommonJS module.exports.resolve function', () => {
        const result = compile(`{ a: Base { } }`, {
            'Base.exon': `fn.native { path: "./impl.js" }`,
            'impl.js': `module.exports.resolve = function(obj, context) { return { style: "commonjs" }; };`
        });
        expect(result).toEqual({ a: { style: 'commonjs' } });
    });

    it('supports a TypeScript-compiled default-exported class with a resolve method', () => {
        const result = compile(`{ a: Base { } }`, {
            'Base.exon': `fn.native { path: "./impl.js" }`,
            'impl.js': `
                class Component {
                    resolve(obj, context) { return { style: "class" }; }
                }
                exports.default = Component;
            `
        });
        expect(result).toEqual({ a: { style: 'class' } });
    });

    it('the id-less delegate path re-instantiates a default-exported class on every resolution (module-level state persists, instance-level state does not)', () => {
        const result = compile(`{ a: Base { } b: Base { } }`, {
            'Base.exon': `fn.native { path: "./impl.js" }`,
            'impl.js': `
                let instances = 0;
                class Component {
                    constructor() { instances++; }
                    resolve(obj, context) { return { instances }; }
                }
                exports.default = Component;
            `
        });
        expect(result).toEqual({ a: { instances: 1 }, b: { instances: 2 } });
    });
});

// ---------------------------------------------------------------------------
// fn.native { id, path } declared and used together within
// ---------------------------------------------------------------------------

describe('fn.native: declared inline in and used immediately', () => {
    it('a local native declaration is immediately usable within the same file', () => {
        const result = compile(`
            fn.sequence {
                fn.native { id: "lib.hello" path: "./impl.js" }
                { msg: lib.hello { n: 1 } }
            }
            `, {
            'impl.js': `module.exports.resolve = function(obj, context) { return "hello" + obj.n; };`
        });
        expect(result).toEqual({ msg: 'hello1' });
    });

    it('importing the declaring file injects the registered native into the importer', () => {
        const result = compile(`Extended { }`, {
            'Base.exon': `
                fn.sequence {
                    fn.native { id: "sum" path: "./impl.js" }
                    sum { a: 1 b: 2 }
                }
            `,
            'Extended.exon': `fn.sequence { { x: Base {} y: sum { a: 2 b: 3 } } }`,
            'impl.js': `module.exports.resolve = function(obj, context) { return obj.a + obj.b; };`
        });
        expect(result).toEqual({ x: 3, y: 5 });
    });

    it('a local, deferred native declaration (e.g. foreach) is immediately usable within the same file', () => {
        const result = compile(`
            fn.sequence {
                fn.native { id: "increment" path: "./increment.js" }
                { items: increment { offset: 1 data: [1, 2, 3] do: fn.parameter {"value"} } }
            }
            `, {
            'increment.js': `
                module.exports.isDeferred = function() { return true; };

                module.exports.resolve = function(obj, context) {
                    const data = context.resolve(obj.data);
                    return data.map((rawItem) => {
                        const value = context.resolve(rawItem) + obj.offset;
                        return context.resolve(obj.do, { value });
                    });
                };
            `
        });
        expect(result).toEqual({ items: [2, 3, 4] });
    });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('fn.native: error cases', () => {
    it('throws when an id-less native is resolved without a path', () => {
        expect(() => compile(`{ a: Empty { } }`, {
            'Empty.exon': `fn.native { }`
        })).toThrow(/path/);
    });

    it('throws when id is present but path is missing (onComponentParsed silently skips registration, resolve still requires path)', () => {
        expect(() => compile(`{ a: Weird { } }`, {
            'Weird.exon': `fn.native { id: "weirdThing" }`
        })).toThrow(/path/);
    });

    it('does not throw at parse time when id/path are both missing (onComponentParsed is a silent no-op); only resolving it fails', () => {
        withTempFile('Main.exon', `fn.native { }`, (filePath) => {
            const manager = new ScriptRepository();
            for (const Ctor of Native.components()) {
                manager.register(new Ctor());
            }
            expect(() => new Parser(manager, []).parse(filePath)).not.toThrow();
        });
    });

    it('throws a clear error when the target file cannot be required (id-less delegate path)', () => {
        expect(() => compile(`{ a: Bad { } }`, {
            'Bad.exon': `fn.native { path: "./does-not-exist.js" }`
        })).toThrow(/failed to load/);
    });

    it('throws a clear error when the target file cannot be required (onComponentParsed, id present)', () => {
        expect(() => compile(`{ a: Bad { } }`, {
            'Bad.exon': `fn.native { id: "x" path: "./does-not-exist.js" }`
        })).toThrow(/failed to load/);
    });

    it('throws when the target module exports neither a resolve function nor a resolve-capable default class (id-less)', () => {
        expect(() => compile(`{ a: Bad { } }`, {
            'Bad.exon': `fn.native { path: "./bad.js" }`,
            'bad.js': `module.exports = { notResolve: true };`
        })).toThrow(/must export a resolve/);
    });

    it('throws when the target module exports neither a resolve function nor a resolve-capable default class (with id)', () => {
        expect(() => compile(`{ a: Bad { } }`, {
            'Bad.exon': `fn.native { id: "x" path: "./bad.js" }`,
            'bad.js': `module.exports = { notResolve: true };`
        })).toThrow(/must export a resolve/);
    });
});
