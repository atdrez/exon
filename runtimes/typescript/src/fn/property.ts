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
    private _getter: any;
    private _setter: any;
    private _init: any;
    private _context: Context;
    private _location: {
        file: string;
        line: number;
    };
    private _getterScript: IScript | undefined;
    private _setterScript: IScript | undefined;

    constructor(rawGet: any, rawSet: any, rawInit: any, context: Context) {
        this._getter = rawGet;
        this._setter = rawSet;
        this._init = rawInit;
        this._context = context;
        this._location = {
            file: context.location.file,
            line: context.location.line,
        }
    }

    public name(): string {
        return 'fn.property';
    }

    public resolve(_obj: any, _context: Context): any {
        return this._context.resolve(this._getter);
    }

    public getGetter(_obj: any): IScript {
        if (this._getterScript)
            return this._getterScript;

        this._getterScript = {
            name: () => 'fn.property.getter',
            resolve: (_o: any, _c: Context) => {
                try {
                    return this._context.resolve(this._getter);
                } catch (e) {
                    this._context.rethrow(e, this._location);
                }
            }
        };
        return this._getterScript;
    }

    public getSetter(_obj: any): IScript {
        if (this._setterScript)
            return this._setterScript;

        this._setterScript = {
            name: () => 'fn.property.setter',
            resolve: (_o: any, ctx: Context) => {
                try {
                    this._context.resolve(this._setter, { value: ctx.property()?.value });
                } catch (e) {
                    this._context.rethrow(e, this._location);
                }
            }
        };
        return this._setterScript;
    }

    public runInit(): void {
        if (this._init === undefined) { return; }
        try {
            const currentValue = this._context.resolve(this._getter);
            this._context.resolve(this._init, { value: currentValue });
        } catch (e) {
            this._context.rethrow(e, this._location);
        }
    }

    public toJSON(): any {
        return this._context.resolve(this._getter);
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
