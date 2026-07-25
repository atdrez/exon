// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpVariadic } from "../opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("array.join", 1); }

    public evaluate(_obj: any, values: Array<any>, _context: Context): any {
        if (values.length === 1 && Array.isArray(values[0])) {
            values = values[0];
        }

        const result: Array<any> = [];

        for (const v of values) {
            result.push(v);
        }

        return result;
    }
}
