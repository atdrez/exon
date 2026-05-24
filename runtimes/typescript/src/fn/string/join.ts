// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpVariadic } from "../opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("string.join", 1); }

    public evaluate(obj: any, values: Array<any>, _context: Context) : any {
        if (obj.separator === undefined)
            return values.join("");

        if (values.length === 1) {
            if (Array.isArray(values[0]))
                values = values[0];
        }

        if (typeof obj.separator !== "string")
            throw new Error(`${this.name()}.separator must be string`);

        return values.join(obj.separator);
    }
}