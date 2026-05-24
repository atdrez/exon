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

        const index = content[0];

        if (typeof index !== "number")
            throw new Error(`${this.name()} should have a valid number argument`);

        return scriptArgv[index];
    }
}
