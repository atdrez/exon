// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("process.argv"); }

    public resolve(obj: any, context: Context) : any {
        const content: any[] = obj.__content__ ?? [];
        const scriptArgv = context.options.argv;

        if (content.length > 1)
            throw new Error(`${this.name()} should have zero or one argument`);

        if (!content.length)
            return scriptArgv;

        const key = content[0];

        if (typeof key === "number")
            return scriptArgv[key];

        if (typeof key === "string")
            return context.options.namedArgv[key] ?? null;

        throw new Error(`${this.name()} should have a valid number or string argument`);
    }
}
