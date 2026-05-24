// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("map"); }

    public resolve(obj: any, _context: Context) : any {
        if (!(obj.keys instanceof Array))
            throw new Error(`${this.name()}.keys: invalid type (array expected)`);

        if (!(obj.values instanceof Array))
            throw new Error(`${this.name()}.values: invalid type (array expected)`);

        if (obj.keys.length !== obj.values.length)
            throw new Error(`${this.name()}.keys and ${this.name()}.values arrays should have the same length`);

        const result: Record<string, any> = {};

        for (let i = 0; i < obj.keys.length; i++) {
            result[obj.keys[i]] = obj.values[i];
        }

        return result;
    }
}
