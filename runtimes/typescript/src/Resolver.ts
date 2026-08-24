// SPDX-License-Identifier: MIT

import { Context } from "./Context";
import { IResolver } from "./IResolver";
import { CallSite, LocatedError } from "./ResolverError";
import { RuntimeOptions } from "./RuntimeOptions";
import { IScriptRepository } from "./IScriptRepository";
import { IScript } from "./IScript";

// Field-key sets consulted in the resolver hot loop. Kept at module scope
// (frozen, single instance) so no per-Resolver allocation happens and no
// per-field branch on options.testMode is needed inside resolveRecursive.
//
// SKIP_FIELDS_TEST_MODE is used when RuntimeOptions.testMode is on and
// __tests__ blocks must be resolved. SKIP_FIELDS_DEFAULT is the common
// case (testMode off) and additionally skips __tests__.
//
// Keys intentionally absent from either set:
//   __content__:     field that holds child elements declared inside an object body;
//                    (e.g: Object {1 2 3} is the same as Object{__content__: [1, 2, 3]}
//   __preresolved__: sentinel set by deferred scripts (e.g. fn.property) to cache a result;
//   __bindFile__:    file where an @ref binding was written; always lives inside a
//                    { __bind__, __bindFile__ } value object (never a top-level field);
const SKIP_FIELDS_TEST_MODE: ReadonlySet<string> = new Set([
    '__name__',    // base filename (no extension) of the root object in each file
    '__file__',    // source file path where the object was parsed
    '__line__',    // source line number where the object was parsed
    '__id__',      // declared identifier; enables cross-object @ref lookups
    '__idFile__',  // file where __id__ was declared; scopes IDs per file in the registry
    '__ref__',     // marks this object as a binding reference
    '__native__',  // native component name to invoke during resolution
    '__nativeId__', // id an fn.native{id, path} declaration self-registered under;
                    // consulted only when walking __base__ for inheritance
    '__base__',    // parsed base-type object (inheritance)
    '__bind__',    // binding target for @ref declarations
]);
const SKIP_FIELDS_DEFAULT: ReadonlySet<string> = new Set([...SKIP_FIELDS_TEST_MODE, '__tests__']);

export class Resolver implements IResolver {
    private _context: Context;
    private _manager: IScriptRepository;
    private _idRegistry: Map<string, Map<string, any>> = new Map();
    private _params: { [key: string]: any } | undefined = undefined;
    private _pathStack: string[] = [];
    private _skipFields: ReadonlySet<string>;

    constructor(manager: IScriptRepository, options: RuntimeOptions) {
        this._manager = manager;
        this._context = new Context(this, manager, options);
        this._skipFields = options.testMode ? SKIP_FIELDS_TEST_MODE : SKIP_FIELDS_DEFAULT;
    }

    private registerIdInFile(id: string, file: string, value: any): void {
        let fileMap = this._idRegistry.get(file);

        if (!fileMap) {
            fileMap = new Map<string, any>();
            this._idRegistry.set(file, fileMap);
        }

        fileMap.set(id, value);
    }

    private registerObjectIds(id: string | undefined, idFile: string, isRoot: boolean, rootFile: string, value: any): void {
        if (id) {
            this.registerIdInFile(id, idFile, value);
        }

        if (isRoot) {
            this.registerIdInFile('root', rootFile, value);
        }
    }

    private registerBaseIds(base: any, target: any): void {
        const baseId: string | undefined = base['__id__'];

        if (baseId) {
            this.registerIdInFile(baseId, base['__idFile__'] ?? '', target);
        }

        if ('__name__' in base) {
            this.registerIdInFile('root', base['__file__'] ?? '', target);
        }
    }

    public resolve(obj: any, params?: { [key: string]: any }): any {
        if (params !== undefined) {
            const saved = this._params;
            this._params = params;
            const result = this.resolveImpl(obj);
            this._params = saved;
            return result;
        }

        return this.resolveImpl(obj);
    }

    public resolveWithOptions(obj: any, opts: RuntimeOptions, params?: { [key: string]: any }): any {
        return Resolver.execute(this._manager, obj, opts, params);
    }

    public getCurrentPathStack(): readonly string[] {
        return this._pathStack;
    }

    private resolveImpl(obj: any): any {
        if (Array.isArray(obj)) {
            return this.parseArrayRecursive(obj);
        }

        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        const preresolved = obj['__preresolved__'];
        if (preresolved !== undefined || '__preresolved__' in obj) {
            return preresolved;
        }

        // Destructure hot metadata once instead of re-reading on every branch.
        // These fields are consulted many times below (native lookup, base
        // chain walk, id registration, error rethrow).
        const objFile: string | undefined = obj['__file__'];
        const objLine: number | undefined = obj['__line__'];
        const objBase: any = obj['__base__'];
        const objNative: string | undefined = obj['__native__'];
        const id: string | undefined = obj['__id__'];
        const idFile: string = obj['__idFile__'] ?? '';
        const isFileRoot = '__name__' in obj;

        const location = this._context.location;
        if (objFile) {
            location.file = objFile;
        }

        if (objLine) {
            location.line = objLine;
        }

        const myFileName = location.file;
        const myLine = location.line;

        let native = objNative;
        let nativeSource = obj;

        if (!native && objBase) {
            let base = objBase;
            while (base && !native) {
                // __nativeId__ (a self-registered fn.native{id, path}) takes priority
                // over __native__
                const baseNative = base['__nativeId__'] || base['__native__'];
                if (baseNative) {
                    native = baseNative;
                    nativeSource = base;
                }
                base = base['__base__'];
            }
        }

        const script = native ? this._context.findScript(native) : undefined;

        if (native && !script) {
            throw new Error(`Unable to find '${native}' element`);
        }

        let result: any;

        try {
            if (script?.isDeferred?.()) {
                const rawForLazy = objBase ? this.mergeRawForLazy(obj, script) : obj;

                this.registerObjectIds(id, idFile, isFileRoot, myFileName, rawForLazy);

                // Save-then-register in two passes: the save must observe
                // the true pre-chain registry state, so it has to complete
                // before any registration overwrites existing entries.
                // Chain depth is small, so the cost of two walks is fine
                // and this preserves the exact prior semantics.
                const savedIds = this.saveBaseChainIds(objBase);
                this.registerBaseChainIds(objBase, rawForLazy);

                location.file = nativeSource['__file__'] ?? myFileName;
                location.line = nativeSource['__line__'] ?? myLine;

                result = this._context.resolveScript(script, rawForLazy, this._params);
                this.restoreIds(savedIds);
            } else {
                result = {};
                this.registerObjectIds(id, idFile, isFileRoot, myFileName, result);
                this.resolveRecursive(result, obj);

                if (script) {
                    location.file = nativeSource['__file__'] ?? myFileName;
                    location.line = nativeSource['__line__'] ?? myLine;

                    result = this._context.resolveScript(script, result, this._params);
                }
            }
        } catch (e) {
            this.rethrow(e, myFileName, myLine);
        }

        this.registerObjectIds(id, idFile, isFileRoot, myFileName, result);

        return result;
    }

    private saveBaseChainIds(firstBase: any): Array<[string, string, any]> {
        const saved: Array<[string, string, any]> = [];

        let current = firstBase;
        while (current) {
            const baseId: string | undefined = current['__id__'];
            if (baseId) {
                const baseIdFile: string = current['__idFile__'] ?? '';
                const fileMap = this._idRegistry.get(baseIdFile);
                saved.push([baseId, baseIdFile, fileMap?.get(baseId)]);
            }

            if ('__name__' in current) {
                const baseFile: string = current['__file__'] ?? '';
                const fileMap = this._idRegistry.get(baseFile);
                saved.push(['root', baseFile, fileMap?.get('root')]);
            }

            current = current['__base__'];
        }

        return saved;
    }

    private registerBaseChainIds(firstBase: any, target: any): void {
        let current = firstBase;
        while (current) {
            this.registerBaseIds(current, target);
            current = current['__base__'];
        }
    }

    private restoreIds(saved: Array<[string, string, any]>): void {
        for (const [id, file, value] of saved) {
            if (value === undefined) {
                const fileMap = this._idRegistry.get(file);
                if (fileMap) {
                    fileMap.delete(id);
                    if (fileMap.size === 0) {
                        this._idRegistry.delete(file);
                    }
                }
            } else {
                this.registerIdInFile(id, file, value);
            }
        }
    }

    static _composeObjectFields(obj: any, merged: any, mergeContent: boolean, skipFields: ReadonlySet<string>): any {
        for (const key of Object.keys(obj)) {
            if (skipFields.has(key))
                continue;

            if (!mergeContent || key !== '__content__') {
                merged[key] = obj[key];
                continue;
            }

            // __content__ should always be an array
            if (!Array.isArray(obj[key])) {
                throw new Error(`__content__ must be an array (got ${typeof obj[key]})`);
            }

            const source: any[] = obj[key];
            const target = merged[key];

            if (Array.isArray(target)) {
                // compose into the cloned array
                for (let i = 0; i < source.length; i++) {
                    target.push(source[i]);
                }
            } else {
                // first contribution. copy so later pushes never mutate obj's own array
                merged[key] = source.slice();
            }
        }
    }

    private mergeRawForLazy(obj: any, script: IScript): any {
        const merged: any = {};
        const isComposable = script.isComposable?.() === true;
        const skipFields = this._skipFields;

        // Walk the base chain iteratively into a stack, then compose from
        // root to leaf. Avoids recursion depth and repeated function-call
        // overhead for deep inheritance chains.
        const chain: any[] = [];
        let current: any = obj['__base__'];
        while (current) {
            chain.push(current);
            current = current['__base__'];
        }

        for (let i = chain.length - 1; i >= 0; i--) {
            Resolver._composeObjectFields(chain[i], merged, isComposable, skipFields);
        }
        Resolver._composeObjectFields(obj, merged, isComposable, skipFields);

        return merged;
    }

    private resolveRecursive(obj: any, source: any) {
        const parent = source['__base__'];

        if (parent) {
            this.registerBaseIds(parent, obj);
            this.resolveRecursive(obj, parent);
        }

        const skipFields = this._skipFields;
        const pathStack = this._pathStack;
        const context = this._context;

        for (const key of Object.keys(source)) {
            if (skipFields.has(key)) {
                continue;
            }

            const sourceValue = source[key];

            if (key.includes('.')) {
                this.setNestedProperty(obj, key, sourceValue);
                continue;
            }

            const isComponentDef = key.charCodeAt(0) === 95 /* '_' */
                && key.startsWith('__componentDef_') && key.endsWith('__');
            const trackPath = key !== '__content__' && !isComponentDef;

            if (trackPath) {
                pathStack.push(key);
            }

            if (isComponentDef) {
                this.parseValueRecursive(sourceValue);
            } else if (sourceValue === undefined || sourceValue === null) {
                context.setProperty(obj, key, null);
            } else if (typeof sourceValue === 'object' && sourceValue['__ref__']) {
                const target = context.getProperty(obj, key);
                this.applyPartialOverride(target, sourceValue);
            } else if (key === '__content__') {
                const existing = context.getProperty(obj, key);
                const resolved = this.parseValueRecursive(sourceValue);
                context.setProperty(obj, key, Array.isArray(existing) ? existing.concat(resolved) : resolved);
            } else {
                context.setProperty(obj, key, this.parseValueRecursive(sourceValue));
            }

            if (trackPath) {
                pathStack.pop();
            }
        }
    }

    private static traverseRoute(resolved: any, segments: string[]): any {
        let current = resolved;
        for (const seg of segments) {
            if (current === null || current === undefined) {
                return undefined;
            }
            if (Array.isArray(current)) {
                const idx = parseInt(seg, 10);
                if (isNaN(idx) || idx < 0 || idx >= current.length) {
                    return undefined;
                }
                current = current[idx];
            } else if (typeof current === 'object') {
                current = current[seg];
            } else {
                return undefined;
            }
        }
        return current;
    }

    public static execute(manager: IScriptRepository, obj: any, opts: RuntimeOptions, params?: { [key: string]: any }): any {
        const resolver = new Resolver(manager, opts);
        const evaluation = resolver.resolve(obj, params);

        if (!opts.route || !opts.route.length)
            return evaluation;

        const result = Resolver.traverseRoute(evaluation, opts.route);

        if (result === undefined)
            throw new Error(`not found: /${opts.route.join('/')}`);

        return result;
    }

    public rethrow(error: unknown, callerFile: string, callerLine: number): never {
        if (!(error instanceof Error)) {
            throw error;
        }

        if (error instanceof LocatedError) {
            if (error.locatedFile !== callerFile && callerFile) {
                const site: CallSite = { file: callerFile, line: callerLine };
                throw new LocatedError(error.userMessage, callerFile, [site, ...error.callStack]);
            }
            throw error;
        }

        const site: CallSite = { file: callerFile, line: callerLine };
        throw new LocatedError(error.message, callerFile, [site]);
    }

    public registerBinding(id: string, file: string, value: any): void {
        this.registerIdInFile(id, file, value);
    }

    public resolveBinding(path: string, file: string): any {
        // visited is allocated lazily on the first recursive descent (see
        // resolveBindingImpl). The common case is a single-hop lookup that
        // never recurses, so the Set would otherwise be allocated and
        // discarded unused.
        return this.resolveBindingImpl(path, file, null);
    }

    private resolveBindingImpl(path: string, file: string, visited: Set<string> | null): any {
        // Cycle-detection key: only allocate/consult the visited Set when
        // it already exists (a recursive descent through @ref->@ref).
        // Single-hop resolutions never see the same (file, path) twice.
        if (visited !== null) {
            const key = `${file}::${path}`;
            if (visited.has(key)) {
                throw new Error(`Circular binding reference: @${path}`);
            }
            visited.add(key);
        }

        const parts = path.split('.');
        const id = parts[0];
        const fileMap = this._idRegistry.get(file);
        const target = fileMap?.get(id);

        if (target === undefined) {
            throw new Error(`Unknown id reference: @${id}`);
        }

        let result = target;
        const context = this._context;

        for (let i = 1; i < parts.length; i++) {
            if (context.isObjectBinding(result)) {
                result = this.resolveBindingImpl(result['__bind__'], result['__bindFile__'] ?? file,
                    this.ensureVisited(visited, path, file));
            }

            if (typeof result === 'object' && result !== null && '__preresolved__' in result) {
                result = result['__preresolved__'];
            }

            if (result === undefined || result === null) {
                throw new Error(`Cannot access property '${parts[i]}' on undefined`);
            }

            result = context.getProperty(result, parts[i]);
        }

        if (context.isObjectBinding(result)) {
            return this.resolveBindingImpl(result['__bind__'], result['__bindFile__'] ?? file,
                this.ensureVisited(visited, path, file));
        }

        if (typeof result === 'object' && result !== null && '__preresolved__' in result) {
            return result['__preresolved__'];
        }

        if (Array.isArray(result)) {
            return result.map(item => this.parseValueRecursive(item));
        }

        return result;
    }

    private ensureVisited(visited: Set<string> | null, path: string, file: string): Set<string> {
        if (visited !== null) {
            return visited;
        }
        // First recursive descent: seed the Set with the current entry so
        // the callee will detect a cycle back to us.
        const created = new Set<string>();
        created.add(`${file}::${path}`);
        return created;
    }

    private setNestedProperty(obj: any, key: string, value: any): void {
        const parts = key.split('.');
        let target = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            target = this._context.getProperty(target, parts[i]);
            if (target === undefined || target === null) {
                throw new Error(`Cannot override '${key}': '${parts.slice(0, i + 1).join('.')}' is ${String(target)}`);
            }
        }
        const leafKey = parts[parts.length - 1];
        this._context.setProperty(target, leafKey, value === null ? null : this.parseValueRecursive(value));
    }

    private applyPartialOverride(target: any, refObj: any): void {
        for (const key of Object.keys(refObj)) {
            if (key.charCodeAt(0) === 95 /* '_' */ && key.startsWith('__')) {
                continue;
            }

            const value = refObj[key];
            if (typeof value === 'object' && value !== null && value['__ref__']) {
                this.applyPartialOverride(this._context.getProperty(target, key), value);
            } else {
                this._context.setProperty(target, key, this.parseValueRecursive(value));
            }
        }
    }

    private parseValueRecursive(value: any): any {
        if (Array.isArray(value)) {
            return this.parseArrayRecursive(value);
        }

        if (typeof value === 'object' && value !== null) {
            const bind = value['__bind__'];
            if (bind !== undefined) {
                const bound = this.resolveBinding(bind, value['__bindFile__'] ?? '');
                if (typeof bound === 'object' && bound !== null && !Array.isArray(bound)
                    && ('__base__' in bound || '__native__' in bound || '__file__' in bound)) {
                    return this.resolveImpl(bound);
                }
                return bound;
            }

            if ('__preresolved__' in value) {
                return value['__preresolved__'];
            }

            return this.resolveImpl(value);
        }

        return value;
    }

    private parseArrayRecursive(value: unknown[]): unknown[] {
        const length = value.length;
        const result = new Array<unknown>(length);
        const pathStack = this._pathStack;

        for (let i = 0; i < length; i++) {
            const item = value[i];

            // Primitive elements never recurse into a script, so nothing
            // downstream can observe the path stack. Skip the index push
            // and its String(i) allocation in that case (the common one
            // for large primitive arrays).
            if (item === null || typeof item !== 'object') {
                result[i] = item;
                continue;
            }

            pathStack.push(String(i));
            result[i] = this.parseValueRecursive(item);
            pathStack.pop();
        }

        return result;
    }
}
