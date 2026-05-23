// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("string.parseInt"); }

    public evaluate(obj: any, content: any, _context: Context) : any {
        if (typeof content !== "string")
            throw new Error(`${this.name()} must receive a string`);

        return parseInt(content);
    }
}