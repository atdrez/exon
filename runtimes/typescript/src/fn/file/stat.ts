// SPDX-License-Identifier: MIT

import * as FS from "fs";
import * as Path from "path";
import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("file.stat"); }

    public resolve(obj: any, context: Context) : any {
        if (typeof obj.path !== "string")
            throw new Error(`${this.name()}.path: invalid type (expected string)`);

        const dirName = Path.dirname(context.location.file);
        const fileName = Path.resolve(dirName, obj.path);

        let stat: FS.Stats;

        try {
            stat = FS.statSync(fileName);
        } catch {
            throw new Error(`${this.name()} unable to stat '${fileName}' file`);
        }

        return {
            size: stat.size,
            isDir: stat.isDirectory(),
            isFile: stat.isFile(),
            isSymlink: stat.isSymbolicLink(),
            mtimeMs: stat.mtimeMs,
            ctimeMs: stat.ctimeMs,
            atimeMs: stat.atimeMs,
            birthtimeMs: stat.birthtimeMs
        };
    }
}
