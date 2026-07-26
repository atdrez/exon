// SPDX-License-Identifier: MIT

import * as Path from "path";
import { Base } from "./base";
import { Context, IScript } from "../IScript";

type NativeTarget = {
    isDeferred?: () => boolean;
    resolve: (obj: any, context: Context) => any;
};

function wrapNativeTarget(target: any): NativeTarget {
    return {
        resolve: (o: any, ctx: Context) => target.resolve(o, ctx),
        ...(typeof target.isDeferred === 'function' && { isDeferred: () => target.isDeferred() })
    };
}

function loadNativeTarget(mod: any): NativeTarget {
    // CommonJS
    if (typeof mod.resolve === 'function') {
        return wrapNativeTarget(mod);
    }

    // TypeScript-compiled
    if (typeof mod.default === 'function') {
        const instance = new mod.default();
        if (typeof instance.resolve === 'function') {
            return wrapNativeTarget(instance);
        }
    }

    throw new Error(`module must export a resolve(obj, context) function`);
}

function requireNativeTarget(componentName: string, absPath: string): NativeTarget {
    let mod: any;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        mod = require(absPath);
    } catch (e) {
        throw new Error(`${componentName}: failed to load '${absPath}': ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
        return loadNativeTarget(mod);
    } catch {
        throw new Error(`${componentName}: module '${absPath}' must export a resolve(obj, context) function`);
    }
}

function makeNamedScript(id: string, target: NativeTarget): IScript {
    return {
        name: () => id,
        resolve: target.resolve,
        ...(target.isDeferred && { isDeferred: target.isDeferred })
    };
}

export default class Component extends Base {
    constructor() { super("native"); }

    public onComponentParsed(result: any, dirName: string, register: (script: IScript) => void): void {
        // Self-registers only when `id` is set.
        if (typeof result.id !== 'string' || typeof result.path !== 'string') {
            return;
        }

        const id = result.id;
        const absPath = Path.resolve(dirName, result.path);
        const target = requireNativeTarget(this.name(), absPath);

        register(makeNamedScript(id, target));

        // Stashed separately from __native__ so __base__ inheritance resolves 
        // straight to this registration, while resolving this object directly.
        result['__nativeId__'] = id;
    }

    // Reached when an id-less fn.native is inherited without a named registration
    public resolve(obj: any, context: Context): any {
        if (typeof obj.path !== "string")
            throw new Error(`${this.name()}.path: invalid type (expected string)`);

        const relPath: string = obj.path;
        const dirName = Path.dirname(context.location.file);
        const absPath = Path.resolve(dirName, relPath);

        const target = requireNativeTarget(this.name(), absPath);

        if (typeof obj.id !== "string") {
            // remove `path` from the resolved obj
            const { path: _path, ...rest } = obj;
            return target.resolve(rest, context);
        }

        context.registerScript(makeNamedScript(obj.id, target));
        return null;
    }
}