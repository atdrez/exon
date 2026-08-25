// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context, IScript } from "../IScript";

let componentCounter = 0;

export abstract class ComponentBase extends Base {
    public isDeferred(): boolean {
        return true;
    }

    public isComponent(): boolean {
        return true;
    }

    public onComponentParsed(result: any, _dirName: string, register: (script: IScript) => void): void {
        if (typeof result.id !== 'string')
            return;

        register({
            name: () => result.id,
            resolve: () => {
                throw new Error(`${this.name()} '${result.id}' was used before it was defined`);
            }
        });
    }

    protected static registerSelf(id: string, content: any, filename: string, context: Context) {
        const virtualFile = `__component__:${id}:${++componentCounter}`;
        const rewrittenContent = this.rewriteBindings(content, filename, virtualFile);

        context.registerScript(this.buildComponentScript(id, rewrittenContent, virtualFile));
    }

    private static rewriteBindings(obj: any, fromFile: string, toFile: string): any {
        if (Array.isArray(obj)) {
            return obj.map((item: any) => this.rewriteBindings(item, fromFile, toFile));
        }

        if (typeof obj === 'object' && obj !== null) {
            const result: any = {};
            for (const key of Object.keys(obj)) {
                if ((key === '__bindFile__' || key === '__file__' || key === '__idFile__') && obj[key] === fromFile) {
                    result[key] = toFile;
                } else {
                    result[key] = this.rewriteBindings(obj[key], fromFile, toFile);
                }
            }
            return result;
        }

        return obj;
    }

    private static buildComponentScript(id: string, rewrittenContent: any, virtualFile: string): IScript {
        return {
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

                if (rewrittenContent.__base__) {
                    merged.__base__ = rewrittenContent.__base__;
                }

                return ctx.resolve(merged);
            }
        };
    }
}
