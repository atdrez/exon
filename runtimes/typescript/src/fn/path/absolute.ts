// SPDX-License-Identifier: MIT

import * as path from "path";
import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("path.absolute"); }

    public evaluate(_obj: any, value: any, _context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} expected path argument as string`);

        return path.resolve(value);
    }
}
