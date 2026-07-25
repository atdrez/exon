// SPDX-License-Identifier: MIT

import * as FS from "fs";
import * as Path from "path";
import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("file.delete"); }

    public resolve(obj: any, context: Context) : any {
        if (typeof obj.path !== "string")
            throw new Error(`${this.name()}.path: invalid type (expected string)`);

        const dirName = Path.dirname(context.location.file);
        const fileName = Path.resolve(dirName, obj.path);

        try {
            FS.rmSync(fileName, { recursive: true });
            return null;
        } catch {
            throw new Error(`${this.name()} unable to delete '${fileName}' file`);
        }
    }
}
