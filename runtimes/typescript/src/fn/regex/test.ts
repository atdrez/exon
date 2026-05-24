// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("regex.test"); }

    public evaluate(obj: any, value: any, _context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} expected string argument`);

        if (typeof obj.pattern !== "string")
            throw new Error(`${this.name()}.pattern should be string`);

        const flags = typeof obj.flags === "string" ? obj.flags : "";
        return new RegExp(obj.pattern, flags).test(value);
    }
}
