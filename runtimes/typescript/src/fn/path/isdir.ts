// SPDX-License-Identifier: MIT

import fs from "fs";
import nodePath from "path";
import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("path.isdir"); }

    public evaluate(_obj: any, value: any, context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} expected path argument as string`);

        const resolved = nodePath.isAbsolute(value)
            ? value
            : nodePath.resolve(nodePath.dirname(context.location.file), value);

        try {
            return fs.statSync(resolved).isDirectory();
        }
        catch {
            return false;
        }
    }
}