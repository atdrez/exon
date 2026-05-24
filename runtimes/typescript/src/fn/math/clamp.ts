// SPDX-License-Identifier: MIT
import { Context } from "../../Context";
import { OpVariadic } from "../opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("math.clamp", 3, 3); }

    public evaluate(obj: any, values: Array<any>, _context: Context) : any {
        const value = values[0];
        const min = values[1];
        const max = values[2];

        return Math.min(max, Math.max(min, value));
    }
}