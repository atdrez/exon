// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("typeof"); }

    protected evaluate(obj: any, value: any, _context: Context): any {
        if (value === null) {
            return "null";
        }

        if (value === undefined) {
            return "undefined";
        }

        if (Array.isArray(value)) {
            return "array";
        }

        return typeof value;
    }
}
