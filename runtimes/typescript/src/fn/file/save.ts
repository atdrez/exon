// SPDX-License-Identifier: MIT

import * as FS from "fs";
import * as Path from "path";
import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("file.save"); }

    public resolve(obj: any, context: Context) : any {
        if (typeof obj.path !== "string")
            throw new Error(`${this.name()}.path: invalid type (expected string)`);

        if (obj.data === undefined || obj.data === null)
            throw new Error(`${this.name()}.data: missing required parameter`);

        const dirName = Path.dirname(context.location.file);
        const fileName = Path.isAbsolute(obj.path) ? obj.path : `${dirName}/${obj.path}`;

        try {
            FS.writeFileSync(fileName, obj.data);
            return null;
        } catch {
            throw new Error(`${this.name()} unable to save '${fileName}' file`);
        }
    }
}
