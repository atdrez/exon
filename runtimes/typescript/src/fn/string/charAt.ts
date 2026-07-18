// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("string.charAt"); }

    public evaluate(obj: any, value: any, _context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} must receive string`);

        if (typeof obj.index !== "number")
            throw new Error(`${this.name()}.index must be number`);

        return value.charAt(obj.index);
    }
}
