// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpBinary } from "../opBinary";

export default class Component extends OpBinary {
    constructor() { super("string.endsWith"); }

    protected evaluate(obj: any, left: any, right: any, _context: Context) : any {
        if (typeof left !== "string" || typeof right !== "string")
            throw new Error(`${this.name()} must receive string`);

        return left.endsWith(right);
    }
}