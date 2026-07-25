// SPDX-License-Identifier: MIT

import nodePath from "path";
import { Context } from "../../IScript";
import { OpBinary } from "../opBinary";
import { resolveRealPath } from "./real";

export default class Component extends OpBinary {
    constructor() { super("path.isInside"); }

    protected evaluate(_obj: any, left: any, right: any, context: Context): any {
        if (typeof left !== "string" || typeof right !== "string")
            throw new Error(`${this.name()} must receive string`);

        const dirName = nodePath.dirname(context.location.file);

        const target = resolveRealPath(nodePath.isAbsolute(left) ? left : nodePath.resolve(dirName, left));
        const root = resolveRealPath(nodePath.isAbsolute(right) ? right : nodePath.resolve(dirName, right));

        const relative = nodePath.relative(root, target);

        if (relative === "")
            return true;

        if (nodePath.isAbsolute(relative))
            return false;

        return relative !== ".." && !relative.startsWith(`..${nodePath.sep}`);
    }
}
