// SPDX-License-Identifier: MIT

import nodePath from "path";
import { Context } from "../../IScript";
import { OpBinary } from "../opBinary";

export default class Component extends OpBinary {
    constructor() { super("path.relative"); }

    protected evaluate(_obj: any, left: any, right: any, context: Context): any {
        if (typeof left !== "string" || typeof right !== "string")
            throw new Error(`${this.name()} must receive string`);

        const dirName = nodePath.dirname(context.location.file);
        const from = nodePath.resolve(dirName, left);
        const to = nodePath.resolve(dirName, right);

        return nodePath.relative(from, to);
    }
}
