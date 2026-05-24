// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context, IScript } from "../IScript";

let componentCounter = 0;

function rewriteBindings(obj: any, fromFile: string, toFile: string): any {
    if (Array.isArray(obj)) {
        return obj.map((item: any) => rewriteBindings(item, fromFile, toFile));
    }

    if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const key of Object.keys(obj)) {
            if ((key === '__bindFile__' || key === '__file__' || key === '__idFile__') && obj[key] === fromFile) {
                result[key] = toFile;
            } else {
                result[key] = rewriteBindings(obj[key], fromFile, toFile);
            }
        }
        return result;
    }

    return obj;
}

export default class Component extends Base {
    constructor() { super("component"); }

    public isDeferred(): boolean {
        return true;
    }

    public isComponent(): boolean {
        return true;
    }

    public onComponentParsed(result: any, _dirName: string, register: (script: IScript) => void): void {
        if (typeof result.id !== 'string') {
            return;
        }
        const id: string = result.id;
        register({
            name: () => id,
            resolve: () => { throw new Error(`${this.name()} '${id}' was used before it was defined`); }
        });
    }

    public resolve(obj: any, context: Context): any {
        if (typeof obj.id !== "string")
            throw new Error(`${this.name()}.id: invalid type (expected string)`);

        if (typeof obj.content !== "object" || obj.content === null)
            throw new Error(`${this.name()}.content: invalid type (expected object)`);

        const id: string = obj.id;
        const rawContent: any = obj.content;
        const contentFile: string = rawContent.__file__ ?? "";
        const virtualFile = `__component__:${id}:${++componentCounter}`;
        const rewrittenContent = rewriteBindings(rawContent, contentFile, virtualFile);

        const script: IScript = {
            name: () => id,
            isDeferred: () => true,
            resolve: (callerObj: any, ctx: Context): any => {
                const merged: any = {};

                for (const key of Object.keys(rewrittenContent)) {
                    if (!key.startsWith('__')) {
                        merged[key] = rewrittenContent[key];
                    }
                }

                for (const key of Object.keys(callerObj)) {
                    if (!key.startsWith('__')) {
                        merged[key] = callerObj[key];
                    }
                }

                merged.__file__ = virtualFile;
                merged.__name__ = "";

                if (rewrittenContent.__native__) {
                    merged.__native__ = rewrittenContent.__native__;
                }

                return ctx.resolve(merged);
            }
        };

        context.registerScript(script);
        return null;
    }
}
