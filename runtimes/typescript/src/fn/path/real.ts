// SPDX-License-Identifier: MIT

import fs from "fs";
import nodePath from "path";
import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

// Resolves symlinks as far up the path as they exist. Segments that don't
// exist yet (e.g. a file about to be created) are kept as-is, so callers
// can still validate a target path before it lands on disk.
export function resolveRealPath(target: string): string {
    try {
        return fs.realpathSync(target);
    }
    catch {
        const parent = nodePath.dirname(target);

        if (parent === target) {
            return target;
        }

        return nodePath.join(resolveRealPath(parent), nodePath.basename(target));
    }
}

export default class Component extends OpUnary {
    constructor() { super("path.real"); }

    public evaluate(_obj: any, value: any, context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} expected path argument as string`);

        const resolved = nodePath.isAbsolute(value)
            ? value
            : nodePath.resolve(nodePath.dirname(context.location.file), value);

        return resolveRealPath(resolved);
    }
}
