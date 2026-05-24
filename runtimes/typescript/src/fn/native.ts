// SPDX-License-Identifier: MIT

import * as Path from "path";
import { Base } from "./base";
import { Context, IScript } from "../IScript";

export default class Component extends Base {
    constructor() { super("native"); }

    public onComponentParsed(result: any, dirName: string, register: (script: IScript) => void): void {
        if (typeof result.id !== 'string' || typeof result.path !== 'string') {
            return;
        }
        const id: string = result.id;
        const absPath = Path.resolve(dirName, result.path);
        let mod: any;
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            mod = require(absPath);
        } catch (e) {
            throw new Error(`${this.name()}: failed to load '${absPath}': ${e instanceof Error ? e.message : String(e)}`);
        }
        if (typeof mod.resolve !== 'function') {
            throw new Error(`${this.name()}: module '${absPath}' must export a resolve(obj, context) function`);
        }
        register({
            name: () => id,
            resolve: (o: any, ctx: Context) => mod.resolve(o, ctx),
            ...(typeof mod.isDeferred === 'function' && { isDeferred: () => mod.isDeferred() })
        });
    }

    public resolve(obj: any, context: Context): any {
        if (typeof obj.id !== "string")
            throw new Error(`${this.name()}.id: invalid type (expected string)`);

        if (typeof obj.path !== "string")
            throw new Error(`${this.name()}.path: invalid type (expected string)`);

        const id: string = obj.id;
        const relPath: string = obj.path;
        const dirName = Path.dirname(context.location.file);
        const absPath = Path.resolve(dirName, relPath);

        let mod: any;

        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            mod = require(absPath);
        } catch (e) {
            throw new Error(`${this.name()}: failed to load '${absPath}': ${e instanceof Error ? e.message : String(e)}`);
        }

        if (typeof mod.resolve !== "function")
            throw new Error(`${this.name()}: module '${absPath}' must export a resolve(obj, context) function`);

        const script: IScript = {
            name: () => id,
            resolve: (o: any, ctx: Context) => mod.resolve(o, ctx),
            ...(typeof mod.isDeferred === "function" && { isDeferred: () => mod.isDeferred() })
        };

        context.registerScript(script);
        return null;
    }
}
