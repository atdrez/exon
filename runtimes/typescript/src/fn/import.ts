// SPDX-License-Identifier: MIT

import * as Path from "path";
import { Parser } from "../Parser";
import { Context } from "../IScript";
import { ComponentBase } from "./componentBase";

export default class Component extends ComponentBase {
    constructor() { super("import"); }

    public resolve(obj: any, context: Context): any {
        const path = context.resolve(obj.__content__[0]);

        if (typeof path !== "string")
            throw new Error(`${this.name()}.path: invalid type (expected string)`);

        const relativePath: string = path;
        const dirName = Path.dirname(context.location.file);
        const absolutePath = Path.resolve(dirName, relativePath);

        const parser = new Parser(context.getScriptRepository());
        let rawContent: any;
        try {
            rawContent = parser.parse(absolutePath);
        } catch (e) {
            throw new Error(`${this.name()}: failed to load '${absolutePath}': ${e instanceof Error ? e.message : String(e)}`);
        }

        if (typeof obj.id === "string") {
            Component.registerSelf(obj.id, rawContent, rawContent.__file__ ?? absolutePath, context);
            return null;
        }

        return context.resolve(rawContent);
    }
}
