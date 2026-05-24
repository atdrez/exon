// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("get"); }

    public resolve(obj: any, context: Context) : any {
        if (!(obj.target instanceof Object))
            throw new Error(`${this.name()}.target invalid`);

        const value : any = this.getValueForObject(obj);

        if (value && typeof value.getGetter === 'function') {
            const getter = value.getGetter(obj.target);

            if (getter === undefined)
                throw new Error(`Invalid property getter`);

            return getter.resolve(obj.target, context);
        }

        return value;
    }

    private getValueForObject(obj: any) {
        const isIndex = (obj.index !== undefined);
        const isProperty = (obj.property !== undefined);

        if (isIndex && isProperty)
             throw new Error(`${this.name()} either property or index should be defined`);

        if (isIndex) {
            if (typeof obj.index !== "number")
                throw new Error(`${this.name()}.number invalid`);

            if (!Array.isArray(obj.target))
                 throw new Error(`${this.name()}.target is not an array`);

            return obj.target[obj.index];
        }

        if (isProperty) {
            if (typeof obj.property !== "string")
                throw new Error(`${this.name()}.property invalid`);

            if (!(obj.target instanceof Object))
                 throw new Error(`${this.name()}.target is not an object`);

            return obj.target[obj.property];
        }

        throw new Error(`${this.name()} property or index must be defined`);
    }
}