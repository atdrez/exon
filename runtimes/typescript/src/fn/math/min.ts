// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpVariadic } from "../opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("math.min", 2); }

    public evaluate(obj: any, values: Array<any>, _context: Context) : any {
        let result = values[0];

        for (let i = 1; i < values.length; i++) {
            result = Math.min(result, values[i]);
        }

        return result;
    }
}