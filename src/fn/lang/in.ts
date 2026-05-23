// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpBinary } from "../opBinary";

export default class Component extends OpBinary {
    constructor() { super("in"); }

    public evaluate(obj: any, left: any, right: any, _context: Context): any {
        if (Array.isArray(right)) {
            return right.includes(left);
        }

        if (right !== null && typeof right === "object") {
            return Object.prototype.hasOwnProperty.call(right, String(left));
        }

        throw new Error(`${this.name()} right operand must be an array or object`);
    }
}
