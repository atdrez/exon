// SPDX-License-Identifier: MIT

import path from "path";
import { Context } from "../../IScript";
import { OpBinary } from "../opBinary";

export default class Component extends OpBinary {
    constructor() { super("path.resolve"); }

    protected evaluate(_obj: any, left: any, right: any, _context: Context): any {
        if (typeof left !== "string" || typeof right !== "string")
            throw new Error(`${this.name()} must receive string`);

        return path.resolve(left, right);
    }
}
