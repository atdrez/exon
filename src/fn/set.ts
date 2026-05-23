// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("set"); }

    public resolve(obj: any, context: Context) : any {
        if (!(obj.target instanceof Object))
            throw new Error(`${this.name()}.target invalid`);

        if (typeof obj.property !== "string")
            throw new Error(`${this.name()}.property invalid`);

        if (obj.value === undefined)
            throw new Error(`${this.name()}.value invalid`);

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