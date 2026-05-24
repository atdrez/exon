// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("number.is"); }

    public evaluate(obj: any, value: any, _context: Context): any {
        return (typeof value === "number" && !Number.isNaN(value));
    }
}