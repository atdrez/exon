// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpBinary } from "../opBinary";

export default class Component extends OpBinary {
    constructor() { super("xor"); }

    public evaluate(obj: any, left: any, right: any, _context: Context): any {
        return (!!left !== !!right);
    }
}
