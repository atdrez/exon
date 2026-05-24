import { describe, it, expect } from 'vitest';
import { Parser } from '../src/Parser';
import { Resolver } from '../src/Resolver';
import { RuntimeOptions } from '../src/RuntimeOptions';
import { ScriptRepository } from '../src/ScriptRepository';
import { IScript } from '../src/IScript';
import { Context } from '../src/Context';
import { compile } from './helpers';

// ---------------------------------------------------------------------------
// Circular import detection
// ---------------------------------------------------------------------------

describe('circular import detection', () => {
    it('throws when a file directly extends itself', () => {
        expect(() =>
            compile('Cyclic { }', {
                'Cyclic.exon': 'Cyclic { }',
            })
        ).toThrow('Circular import detected');
    });

    it('throws on a two-step cycle: A extends B extends A', () => {
        expect(() =>
            compile('A { }', {
                'A.exon': 'B { x: 1 }',
                'B.exon': 'A { y: 2 }',
            })
        ).toThrow('Circular import detected');
    });

    it('throws on a three-step cycle: A -> B -> C -> A', () => {
        expect(() =>
            compile('A { }', {
                'A.exon': 'B { }',
                'B.exon': 'C { }',
                'C.exon': 'A { }',
            })
        ).toThrow('Circular import detected');
    });

    it('does not throw when multiple files share a common base without a cycle', () => {
        expect(() =>
            compile('A { }', {
                'A.exon': 'Base { role: "a" }',
                'Base.exon': '{ color: "red" }',
            })
        ).not.toThrow();
    });

    it('includes all files in the cycle path in the error message', () => {
        let message = '';
        try {
            compile('A { }', {
                'A.exon': 'B { }',
                'B.exon': 'A { }',
            });
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toMatch(/A\.exon/);
        expect(message).toMatch(/B\.exon/);
    });
});

// ---------------------------------------------------------------------------
// Circular binding detection
// ---------------------------------------------------------------------------
//
// The binding cycle fires when the ID registry entry for an id is itself a
// raw { __bind__ } wrapper. This happens when a deferred script returns a
// __bind__ object as its result: the Resolver writes that result back to the
// registry via the second registerObjectIds() call.
//
// We use two tiny mock scripts to set this up without touching real exon
// syntax or the examples directory.

const FILE = '/test/Cycle.exon';

// Returns a __bind__ wrapper that points back to the same id 'self'.
class SelfRefScript implements IScript {
    name() { return 'fn.test.selfref'; }
    isDeferred() { return true; }
    resolve(_obj: any, ctx: Context): any {
        return { __bind__: 'self', __bindFile__: ctx.location.file };
    }
}

// Returns a __bind__ wrapper pointing to a specified id (used to build
// indirect cycles: script-a returns a ref to 'b', script-b returns a ref to 'a').
class CrossRefScript implements IScript {
    readonly #scriptName: string;
    readonly #targetId: string;

    constructor(scriptName: string, targetId: string) {
        this.#scriptName = scriptName;
        this.#targetId = targetId;
    }

    name() { return this.#scriptName; }
    isDeferred() { return true; }
    resolve(_obj: any, ctx: Context): any {
        return { __bind__: this.#targetId, __bindFile__: ctx.location.file };
    }
}

function makeResolver(scripts: IScript[]): Resolver {
    const manager = new ScriptRepository();
    for (const s of scripts) {
        manager.register(s);
    }
    const options = new RuntimeOptions({ run: false, test: false });
    return new Resolver(manager, options);
}

// Build a minimal AST node accepted by resolve(): the __file__, __line__,
// __id__ and __native__ fields are the only ones needed.
function astNode(id: string, nativeName: string): any {
    return {
        __file__: FILE,
        __line__: 1,
        __name__: id,
        __id__: id,
        __idFile__: FILE,
        __native__: nativeName,
    };
}

describe('circular binding detection', () => {
    it('throws when a binding directly references itself', () => {
        const resolver = makeResolver([new SelfRefScript()]);

        // After resolve(), the registry entry for 'self' becomes the
        // __bind__ wrapper that SelfRefScript returned, creating a direct cycle.
        resolver.resolve(astNode('self', 'fn.test.selfref'));

        expect(() => resolver.resolveBinding('self', FILE))
            .toThrow('Circular binding reference: @self');
    });

    it('throws on an indirect cycle: binding a references b which references a', () => {
        const resolver = makeResolver([
            new CrossRefScript('fn.test.refa', 'b'),
            new CrossRefScript('fn.test.refb', 'a'),
        ]);

        // Register both ids in the registry with cross-referencing __bind__ values.
        resolver.resolve(astNode('a', 'fn.test.refa'));
        resolver.resolve(astNode('b', 'fn.test.refb'));

        // resolveBinding('a') -> sees __bind__: 'b' -> resolveBinding('b')
        // -> sees __bind__: 'a' -> resolveBinding('a') -> already visited -> throws.
        expect(() => resolver.resolveBinding('a', FILE))
            .toThrow('Circular binding reference');
    });

    it('does not throw for a valid binding chain without a cycle', () => {
        // Object@id creates a plain object with a binding id without a file lookup.
        // @greet.message then references that object's property. No cycle.
        expect(() =>
            compile(`{
                greet: Object@greet { message: "hello" }
                echo: @greet.message
            }`)
        ).not.toThrow();
    });

    it('does not trigger on the same binding accessed multiple times independently', () => {
        // Each resolveBinding call starts with a fresh visited set, so
        // calling it twice on the same id should be fine.
        const resolver = makeResolver([new SelfRefScript()]);
        resolver.resolve(astNode('self', 'fn.test.selfref'));

        // Both calls should throw (because the registry entry IS a self-ref),
        // but each should throw independently without interference.
        expect(() => resolver.resolveBinding('self', FILE))
            .toThrow('Circular binding reference');
        expect(() => resolver.resolveBinding('self', FILE))
            .toThrow('Circular binding reference');
    });
});
