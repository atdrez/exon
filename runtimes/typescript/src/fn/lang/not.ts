// SPDX-License-Identifier: MIT

import { OpUnary } from "../opUnary";
import { Context } from "../../IScript";

export default class Component extends OpUnary {
    constructor() { super("not"); }

    protected evaluate(obj: any, value: any, _context: Context): any {
        return !(value);
    }
}
