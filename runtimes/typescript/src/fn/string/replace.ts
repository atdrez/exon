// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("string.replace"); }

    public evaluate(obj: any, value: any, _context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} must receive string`);

        if (typeof obj.search !== "string")
            throw new Error(`${this.name()}.search must be string`);

        if (typeof obj.replacement !== "string")
            throw new Error(`${this.name()}.replacement must be string`);

        return value.replace(obj.search, obj.replacement);
    }
}
