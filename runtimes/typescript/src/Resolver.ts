// SPDX-License-Identifier: MIT

import { Context } from "./Context";
import { IResolver } from "./IResolver";
import { CallSite, LocatedError } from "./ResolverError";
import { RuntimeOptions } from "./RuntimeOptions";
import { IScriptRepository } from "./IScriptRepository";

export class Resolver implements IResolver {
    #context: Context;
    #idRegistry: Map<string, Map<string, any>> = new Map();
    #params: { [key: string]: any } | undefined = undefined;

    static readonly #METADATA_KEYS = new Set([
        '__name__',    // base filename (no extension) of the root object in each file
        '__file__',    // source file path where the object was parsed
        '__line__',    // source line number where the object was parsed
        '__id__',      // declared identifier; enables cross-object @ref lookups
        '__idFile__',  // file where __id__ was declared; scopes IDs per file in the registry
        '__ref__',     // marks this object as a binding reference
        '__native__',  // native component name to invoke during resolution
        '__base__',    // parsed base-type object (inheritance)
        '__bind__',    // binding target for @ref declarations
    ]);
    // Keys intentionally absent from METADATA_KEYS:
    //   __content__:     field that holds child elements declared inside an object body;
    //                    (e.g: Object {1 2 3} is the same as Object{__content__: [1, 2, 3]}
    //   __tests__:       block of test assertions embedded in the exon file; resolved normally when
    //                    testMode is on (-t flag), suppressed entirely otherwise;
    //   __preresolved__: sentinel set by deferred scripts (e.g. fn.property) to cache a result;
    //   __bindFile__:    file where an @ref binding was written; always lives inside a
    //                    { __bind__, __bindFile__ } value object (never a top-level field);

    constructor(manager: IScriptRepository, options: RuntimeOptions) {
        this.#context = new Context(this, manager, options);
    }

    private shouldSkipField(key: string): boolean {
        if (Resolver.#METADATA_KEYS.has(key))
            return true;

        return (key === '__tests__' && !this.#context.options.testMode);
    }

    private registerIdInFile(id: string, file: string, value: any): void {
        let fileMap = this.#idRegistry.get(file);

        if (!fileMap) {
            fileMap = new Map<string, any>();
            this.#idRegistry.set(file, fileMap);
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
            const saved = this.#params;
            this.#params = params;
            const result = this.resolveImpl(obj);
            this.#params = saved;
            return result;
        }

        return this.resolveImpl(obj);
    }

    private resolveImpl(obj: any): any {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }

        if ('__preresolved__' in obj) {
            return obj['__preresolved__'];
        }

        let result: any = {};

        if (obj['__file__']) {
            this.#context.location.file = obj['__file__'];
        }

        if (obj['__line__']) {
            this.#context.location.line = obj['__line__'];
        }

        const myFileName = this.#context.location.file;
        const myLine = this.#context.location.line;

        const isFileRoot = '__name__' in obj;
        const id: string | undefined = obj['__id__'];
        const idFile: string = obj['__idFile__'] ?? '';

        this.registerObjectIds(id, idFile, isFileRoot, myFileName, result);

        let native = obj['__native__'];

        if (!native) {
            let base = obj['__base__'];
            while (base && !native) {
                native = base['__native__'];
                base = base['__base__'];
            }
        }

        const script = native ? this.#context.findScript(native) : undefined;

        if (native && !script) {
            throw new Error(`Unable to find '${native}' element`);
        }

        try {
            if (script?.isDeferred?.()) {
                const rawForLazy = obj['__base__'] ? this.mergeRawForLazy(obj) : obj;

                this.registerObjectIds(id, idFile, isFileRoot, myFileName, rawForLazy);

                const savedIds = this.saveBaseChainIds(obj);
                this.registerBaseChainIds(obj, rawForLazy);
                result = this.#context.resolveScript(script, rawForLazy, this.#params);
                this.restoreIds(savedIds);
            } else {
                this.resolveRecursive(result, obj);

                if (script) {
                    result = this.#context.resolveScript(script, result, this.#params);
                }
            }
        } catch (e) {
            this.rethrow(e, myFileName, myLine);
        }

        this.registerObjectIds(id, idFile, isFileRoot, myFileName, result);

        return result;
    }

    private saveBaseChainIds(obj: any): Array<[string, string, any]> {
        const saved: Array<[string, string, any]> = [];

        let current = obj['__base__'];
        while (current) {
            const baseId: string | undefined = current['__id__'];
            if (baseId) {
                const baseIdFile: string = current['__idFile__'] ?? '';
                const fileMap = this.#idRegistry.get(baseIdFile);
                saved.push([baseId, baseIdFile, fileMap?.get(baseId)]);
            }

            if ('__name__' in current) {
                const baseFile: string = current['__file__'] ?? '';
                const fileMap = this.#idRegistry.get(baseFile);
                saved.push(['root', baseFile, fileMap?.get('root')]);
            }

            current = current['__base__'];
        }

        return saved;
    }

    private restoreIds(saved: Array<[string, string, any]>): void {
        for (const [id, file, value] of saved) {
            if (value === undefined) {
                const fileMap = this.#idRegistry.get(file);
                if (fileMap) {
                    fileMap.delete(id);
                    if (fileMap.size === 0) {
                        this.#idRegistry.delete(file);
                    }
                }
            } else {
                this.registerIdInFile(id, file, value);
            }
        }
    }

    private registerBaseChainIds(obj: any, target: any): void {
        let current = obj['__base__'];
        while (current) {
            this.registerBaseIds(current, target);
            current = current['__base__'];
        }
    }

    private mergeRawForLazy(obj: any): any {
        const merged: any = {};

        const collectBase = (source: any) => {
            const parent = source['__base__'];
            if (parent) {
                collectBase(parent);
            }
            for (const key of Object.keys(source)) {
                if (!this.shouldSkipField(key)) {
                    merged[key] = source[key];
                }
            }
        };

        collectBase(obj['__base__']);
        for (const key of Object.keys(obj)) {
            if (!this.shouldSkipField(key)) {
                merged[key] = obj[key];
            }
        }

        return merged;
    }

    private resolveRecursive(obj: any, source: any) {
        const parent = source['__base__'];

        if (parent) {
            this.registerBaseIds(parent, obj);
            this.resolveRecursive(obj, parent);
        }

        for (const key of Object.keys(source)) {
            if (this.shouldSkipField(key)) {
                continue;
            }

            const sourceValue = source[key];

            if (key.includes('.')) {
                this.setNestedProperty(obj, key, sourceValue);
                continue;
            }

            if (key.startsWith('__componentDef_') && key.endsWith('__')) {
                this.parseValueRecursive(sourceValue);
            } else if (sourceValue === undefined || sourceValue === null) {
                this.#context.setProperty(obj, key, null);
            } else if (typeof sourceValue === 'object' && sourceValue['__ref__']) {
                const target = this.#context.getProperty(obj, key);
                this.applyPartialOverride(target, sourceValue);
            } else if (key === '__content__') {
                const existing = this.#context.getProperty(obj, key);
                const resolved = this.parseValueRecursive(sourceValue);
                this.#context.setProperty(obj, key, Array.isArray(existing) ? existing.concat(resolved) : resolved);
            } else {
                this.#context.setProperty(obj, key, this.parseValueRecursive(sourceValue));
            }
        }
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

    public resolveBinding(path: string, file: string): any {
        return this.resolveBindingImpl(path, file, new Set());
    }

    private resolveBindingImpl(path: string, file: string, visited: Set<string>): any {
        const key = `${file}::${path}`;
        if (visited.has(key)) {
            throw new Error(`Circular binding reference: @${path}`);
        }
        visited.add(key);

        const parts = path.split('.');
        const id = parts[0];
        const fileMap = this.#idRegistry.get(file);
        const target = fileMap?.get(id);

        if (target === undefined) {
            throw new Error(`Unknown id reference: @${id}`);
        }

        let result = target;

        for (let i = 1; i < parts.length; i++) {
            if (this.#context.isObjectBinding(result)) {
                result = this.resolveBindingImpl(result['__bind__'], result['__bindFile__'] ?? file, visited);
            }

            if (result === undefined || result === null) {
                throw new Error(`Cannot access property '${parts[i]}' on undefined`);
            }

            result = this.#context.getProperty(result, parts[i]);
        }

        if (this.#context.isObjectBinding(result)) {
            return this.resolveBindingImpl(result['__bind__'], result['__bindFile__'] ?? file, visited);
        }

        if (Array.isArray(result)) {
            return result.map(item => this.parseValueRecursive(item));
        }

        return result;
    }

    private setNestedProperty(obj: any, key: string, value: any): void {
        const parts = key.split('.');
        let target = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            target = this.#context.getProperty(target, parts[i]);
            if (target === undefined || target === null) {
                throw new Error(`Cannot override '${key}': '${parts.slice(0, i + 1).join('.')}' is ${String(target)}`);
            }
        }
        const leafKey = parts[parts.length - 1];
        this.#context.setProperty(target, leafKey, value === null ? null : this.parseValueRecursive(value));
    }

    private applyPartialOverride(target: any, refObj: any): void {
        for (const key of Object.keys(refObj)) {
            if (key.startsWith('__')) {
                continue;
            }

            const value = refObj[key];
            if (typeof value === 'object' && value !== null && value['__ref__']) {
                this.applyPartialOverride(this.#context.getProperty(target, key), value);
            } else {
                this.#context.setProperty(target, key, this.parseValueRecursive(value));
            }
        }
    }

    private parseValueRecursive(value: any): any {
        if (Array.isArray(value)) {
            return value.map(item => this.parseValueRecursive(item));
        }

        if (typeof value === 'object' && value !== null) {
            if (value['__bind__'] !== undefined) {
                const bound = this.resolveBinding(value['__bind__'], value['__bindFile__'] ?? '');
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
}
