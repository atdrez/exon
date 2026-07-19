// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("math.truncate"); }

    public evaluate(_obj: any, value: any, _context: Context): any {
        return Math.trunc(value);
    }
}
