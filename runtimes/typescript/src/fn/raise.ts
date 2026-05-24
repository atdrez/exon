// SPDX-License-Identifier: MIT

import { Context } from "../IScript";
import { OpUnary } from "./opUnary";

export default class Component extends OpUnary {
    constructor() { super("raise"); }

    public evaluate(obj: any, value: any, _context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} expected string argument`);

        throw new Error(value);
    }
}