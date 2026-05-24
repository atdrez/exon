// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("set"); }

    public resolve(obj: any, context: Context) : any {
        if (!(obj.target instanceof Object))
            throw new Error(`${this.name()}.target invalid`);

        if (obj.value === undefined)
            throw new Error(`${this.name()}.value invalid`);

        const hasProperty = typeof obj.property === 'string';
        const hasIndex = typeof obj.index === 'number';

        if (!hasProperty && !hasIndex)
            throw new Error(`${this.name()}.property invalid`);

        if (hasIndex) {
            const array = hasProperty ? obj.target[obj.property] : obj.target;
            if (!Array.isArray(array))
                throw new Error(`${this.name()}.target is not an array`);
            array[obj.index] = obj.value;
            return;
        }

        const existing = obj.target[obj.property];

        if (existing && typeof existing.getSetter === 'function') {
            const setter = existing.getSetter(obj.target);

            if (setter === undefined)
                throw new Error(`Invalid property setter`);

            context.resolvePropertyScript(setter, obj.target, obj.property, obj.value);
        } else {
            obj.target[obj.property] = obj.value;
        }
    }
}