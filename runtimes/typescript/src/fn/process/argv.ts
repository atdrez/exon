// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("process.argv"); }

    public resolve(obj: any, _context: Context) : any {
        const content = obj.__content__;

        if (content.length > 2)
            throw new Error(`${this.name()} should have zero or one argument`);

        // no argument, return the argv array
        if (!content.length)
            return process.argv;

        const index = content[0];

        if (typeof index !== "number")
            throw new Error(`${this.name()} should have a valid number argument`);

        return process.argv[index];
    }
}
