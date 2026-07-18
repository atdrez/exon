// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpVariadic } from "../opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("string.concat", 1); }

    public evaluate(obj: any, values: Array<any>, _context: Context): any {
        if (values.length === 1 && Array.isArray(values[0]))
            values = values[0];

        for (const v of values) {
            if (typeof v !== "string")
                throw new Error(`${this.name()} all values must be string`);
        }

        return values.join("");
    }
}
