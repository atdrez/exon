// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("string.repeat"); }

    public evaluate(obj: any, value: any, _context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} must receive string`);

        if (typeof obj.count !== "number" || obj.count < 0)
            throw new Error(`${this.name()}.count must be a non-negative number`);

        return value.repeat(obj.count);
    }
}
