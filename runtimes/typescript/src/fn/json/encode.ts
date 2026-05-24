// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("json.encode"); }

    public evaluate(obj: any, content: any, _context: Context) : any {
        if (!(content instanceof Object))
            throw new Error(`${this.name()} content must be an object`);

        if (obj.indent === undefined)
            return JSON.stringify(content, null, 4).replace(/\\\\/g, '\\')

        if (typeof obj.indent !== "number")
            throw new Error(`${this.name()}.indent must be a number`);

        return JSON.stringify(content, null, obj.indent).replace(/\\\\/g, '\\')
    }
}