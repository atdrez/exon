// SPDX-License-Identifier: MIT

import * as FS from "fs";
import * as Path from "path";
import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("file.load"); }

    public resolve(obj: any, context: Context) : any {
        if (typeof obj.path !== "string")
            throw new Error(`${this.name()}.path: invalid type (expected string)`);

        const dirName = Path.dirname(context.location.file);
        const fileName = Path.isAbsolute(obj.path) ? obj.path : `${dirName}/${obj.path}`;
        const isBinary = (obj.binary === true);

        try {
            const data = FS.readFileSync(fileName);
            return isBinary ? data : data.toString();
        } catch {
            throw new Error(`${this.name()} unable to load '${fileName}' file`);
        }
    }
}
