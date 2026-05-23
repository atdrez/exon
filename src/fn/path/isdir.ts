// SPDX-License-Identifier: MIT

import fs from "fs";
import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("path.isdir"); }

    public evaluate(obj: any, value: any, _context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} expected path argument as string`);

        try {
            return fs.statSync(value).isDirectory();
        }
        catch {
            return false;
        }
    }
}