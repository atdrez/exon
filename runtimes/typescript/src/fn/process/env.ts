// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("process.env"); }

    public resolve(obj: any, _context: Context) : any {
        const content = obj.__content__;

        if (!(content instanceof Array) || content.length !== 1)
            throw new Error(`${this.name()} should have one argument`);

        const name = content[0];

        if (typeof name !== "string")
            throw new Error(`${this.name()} should a valid string argument`);

        const value = process.env[name];
        return value === undefined ? null : value;
    }
}
