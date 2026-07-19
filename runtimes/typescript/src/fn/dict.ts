// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("dict"); }

    public resolve(obj: any, _context: Context) : any {
        const content = obj.__content__ ?? [];

        if (!(content instanceof Array))
            throw new Error(`${this.name()} content should be an array`);

        if (content.length % 2 !== 0)
            throw new Error(`${this.name()} requires an even number of key/value arguments`);

        const result: Record<string, any> = {};

        for (let i = 0; i < content.length; i += 2) {
            const key = content[i];

            if (typeof key !== "string")
                throw new Error(`${this.name()} keys must be strings`);

            result[key] = content[i + 1];
        }

        return result;
    }
}
