// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("string.padStart"); }

    public evaluate(obj: any, value: any, _context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} must receive string`);

        if (typeof obj.length !== "number")
            throw new Error(`${this.name()}.length must be number`);

        if (obj.pad !== undefined && typeof obj.pad !== "string")
            throw new Error(`${this.name()}.pad must be string`);

        return value.padStart(obj.length, obj.pad);
    }
}
