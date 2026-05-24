// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("instanceof"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        const content = obj.__content__;

        if (!Array.isArray(content) || content.length !== 2)
            throw new Error(`${this.name()} expects exactly two arguments: object and class name`);

        const item = content[0];
        const className = context.resolve(content[1]);

        if (typeof className !== 'string')
            throw new Error(`${this.name()} second argument must be a string`);

        if (item === null || typeof item !== 'object')
            return false;

        // Native fn.* component: check __native__ directly
        if (typeof item['__native__'] === 'string')
            return item['__native__'] === className;

        // User-defined type: walk the full __base__ chain checking __name__
        let base = item['__base__'];
        while (base !== undefined && base !== null) {
            if (typeof base['__name__'] === 'string' && base['__name__'] === className)
                return true;
            base = base['__base__'];
        }

        return false;
    }
}
