// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("del"); }

    public resolve(obj: any, _context: Context) : any {
        if (!(obj.target instanceof Object) || Array.isArray(obj.target))
            throw new Error(`${this.name()}.target must be an object`);

        if (typeof obj.property !== "string")
            throw new Error(`${this.name()}.property must be a string`);

        const hasIndex = (obj.index !== undefined);

        if (hasIndex) {
            if (typeof obj.index !== "number")
                throw new Error(`${this.name()}.index must be a number`);

            const arr = obj.target[obj.property];

            if (!Array.isArray(arr))
                throw new Error(`${this.name()}.target.${obj.property} is not an array`);

            arr.splice(obj.index, 1);
        } else {
            delete obj.target[obj.property];
        }
    }
}
