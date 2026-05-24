// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("string.split"); }

    public evaluate(obj: any, content: any, _context: Context) : any {
        if (typeof content !== "string")
            throw new Error(`${this.name()} must receive string`);
  
        if (obj.separator === undefined)
            return content.split(" ");

        if (typeof obj.separator !== "string")
            throw new Error(`${this.name()}.separator must be string`);

        return content.split(obj.separator);
    }
}