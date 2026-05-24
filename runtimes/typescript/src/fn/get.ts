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

        if (isIndex) {
            if (typeof obj.index !== "number")
                throw new Error(`${this.name()}.number invalid`);

            const array = isProperty ? obj.target[obj.property] : obj.target;

            if (!Array.isArray(array))
                throw new Error(`${this.name()}.target is not an array`);

            return array[obj.index];
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
