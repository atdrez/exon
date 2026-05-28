// SPDX-License-Identifier: MIT

import { Context } from "../Context";
import { IScript, IPropertyScript } from "../IScript";

function bindRaw(raw: any, context: Context): any {
    if (raw === null || typeof raw !== 'object')
        return raw;

    if (Array.isArray(raw))
        return raw.map(item => bindRaw(item, context));

    if ('__bind__' in raw)
        return { __preresolved__: context.resolveBinding(raw['__bind__'], raw['__bindFile__'] ?? '') };

    const result: any = {};

    for (const key in raw)
        result[key] = key === '__base__' ? raw[key] : bindRaw(raw[key], context);

    return result;
}

class PropertyValue implements IPropertyScript {
    #getter: any;
    #setter: any;
    #init: any;
    #context: Context;
    #location: {
        file: string;
        line: number;
    };

    constructor(rawGet: any, rawSet: any, rawInit: any, context: Context) {
        this.#getter = rawGet;
        this.#setter = rawSet;
        this.#init = rawInit;
        this.#context = context;
        this.#location = {
            file: context.location.file,
            line: context.location.line,
        }
    }

    public name(): string {
        return 'fn.property';
    }

    public resolve(_obj: any, _context: Context): any {
        return this.#context.resolve(this.#getter);
    }

    public getGetter(_obj: any): IScript {
        return {
            name: () => 'fn.property.getter',
            resolve: (_o: any, _c: Context) => {
                try {
                    return this.#context.resolve(this.#getter);
                } catch (e) {
                    this.#context.rethrow(e, this.#location);
                }
            }
        };
    }

    public getSetter(_obj: any): IScript {
        return {
            name: () => 'fn.property.setter',
            resolve: (_o: any, ctx: Context) => {
                try {
                    this.#context.resolve(this.#setter, { value: ctx.property()?.value });
                } catch (e) {
                    this.#context.rethrow(e, this.#location);
                }
            }
        };
    }

    public runInit(): void {
        if (this.#init === undefined) { return; }
        try {
            const currentValue = this.#context.resolve(this.#getter);
            this.#context.resolve(this.#init, { value: currentValue });
        } catch (e) {
            this.#context.rethrow(e, this.#location);
        }
    }

    public toJSON(): any {
        return this.#context.resolve(this.#getter);
    }
}

export default class Component implements IPropertyScript {
    public name(): string {
        return 'fn.property';
    }

    public isDeferred(): boolean {
        return true;
    }

    public getGetter(obj: any): IScript {
        return obj.get as IScript;
    }

    public getSetter(obj: any): IScript {
        return obj.set as IScript;
    }

    public resolve(obj: any, context: Context): any {
        const bind = (raw: any) => bindRaw(raw, context);
        const pv = new PropertyValue(bind(obj.get), bind(obj.set), bind(obj.init), context);
        pv.runInit();
        return pv;
    }
}
