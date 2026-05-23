// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("classname"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, _context: Context): any {
        const content = obj.__content__;

        if (!Array.isArray(content) || content.length !== 1)
            throw new Error(`${this.name()} expects exactly one argument`);

        const item = content[0];

        if (item === null || typeof item !== 'object')
            return null;

        // Inline native component: fn.div { }, fn.seq { }, etc.
        if (typeof item['__native__'] === 'string')
            return item['__native__'];

        // User-defined type via base chain: Person { }, Database { }, etc.
        const base = item['__base__'];
        if (base && typeof base['__name__'] === 'string')
            return base['__name__'];

        return null;
    }
}
