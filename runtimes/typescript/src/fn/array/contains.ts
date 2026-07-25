// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpBinary } from "../opBinary";

export default class Component extends OpBinary {
    constructor() { super("array.contains"); }

    protected evaluate(_obj: any, left: any, right: any, _context: Context): any {
        if (!Array.isArray(left)) {
            throw new Error(`${this.name()} must receive array`);
        }

        return left.includes(right);
    }
}
