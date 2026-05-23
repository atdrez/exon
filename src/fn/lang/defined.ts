// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("defined"); }

    protected evaluate(obj: any, value: any, _context: Context): any {
        return (value !== null && value !== undefined);
    }
}
