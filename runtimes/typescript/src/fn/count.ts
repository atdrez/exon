// SPDX-License-Identifier: MIT

import { Context } from "../IScript";
import { OpUnary } from "./opUnary";

export default class Component extends OpUnary {
    constructor() { super("count"); }

    public evaluate(_obj: any, value: any, _context: Context): any {
        if (!Array.isArray(value))
            throw new Error(`${this.name()} expected array argument`);

        return value.length;
    }
}