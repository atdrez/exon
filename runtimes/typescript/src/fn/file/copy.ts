// SPDX-License-Identifier: MIT

import * as FS from "fs";
import * as Path from "path";
import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("file.copy"); }

    public resolve(obj: any, context: Context) : any {
        if (typeof obj.from !== "string")
            throw new Error(`${this.name()}.from: invalid type (expected string)`);

        if (typeof obj.to !== "string")
            throw new Error(`${this.name()}.to: invalid type (expected string)`);

        const dirName = Path.dirname(context.location.file);
        const toPath = Path.resolve(dirName, obj.to);
        const fromPath = Path.resolve(dirName, obj.from);

        try {
            FS.cpSync(fromPath, toPath, { recursive: true });
            return null;
        } catch {
            throw new Error(`${this.name()} unable to copy '${fromPath}' to '${toPath}'`);
        }
    }
}
