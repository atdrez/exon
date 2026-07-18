// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("string.slice"); }

    public evaluate(obj: any, value: any, _context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} must receive string`);

        if (typeof obj.start !== "number")
            throw new Error(`${this.name()}.start must be number`);

        if (obj.end !== undefined && typeof obj.end !== "number")
            throw new Error(`${this.name()}.end must be number`);

        return value.slice(obj.start, obj.end);
    }
}
