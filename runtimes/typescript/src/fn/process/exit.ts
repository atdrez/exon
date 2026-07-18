// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("process.exit"); }

    protected evaluate(_obj: any, value: any, _context: Context) : any {
        process.exit(Number(value));
    }
}
