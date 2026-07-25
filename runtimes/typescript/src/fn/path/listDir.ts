// SPDX-License-Identifier: MIT

import fs from "fs";
import nodePath from "path";
import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("path.listDir"); }

    public evaluate(_obj: any, value: any, context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} expected path argument as string`);

        const resolved = nodePath.isAbsolute(value)
            ? value
            : nodePath.resolve(nodePath.dirname(context.location.file), value);

        let names: string[];

        try {
            names = fs.readdirSync(resolved);
        }
        catch {
            throw new Error(`${this.name()} unable to list '${resolved}' directory`);
        }

        // lstat (not stat) so symlink entries are reported honestly instead
        // of being silently followed
        return names.map((name) => {
            const entryPath = nodePath.join(resolved, name);
            const stat = fs.lstatSync(entryPath);

            return {
                name,
                path: entryPath,
                isDir: stat.isDirectory(),
                isFile: stat.isFile(),
                isSymlink: stat.isSymbolicLink()
            };
        });
    }
}
