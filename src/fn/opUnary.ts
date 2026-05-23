// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export class OpUnary extends Base {
    public resolve(obj: any, context: Context) : any {
        const content = obj.__content__;

        if (!(content instanceof Array) || content.length !== 1)
            throw new Error(`${this.name()} invalid arguments (expected 1 param)`);

        return this.evaluate(obj, content[0], context);
    }

    protected evaluate(_obj: any, _value: any, _context: Context) : any {
        throw new Error(`Not implemented`);
    }
}