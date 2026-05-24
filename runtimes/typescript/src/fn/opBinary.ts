// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export class OpBinary extends Base {
    public resolve(obj: any, context: Context) : any {
        const content = obj.__content__;

        if (!(content instanceof Array) || content.length !== 2)
            throw new Error(`${this.name()} invalid arguments (expected 2 params)`);

        const left = content[0];
        const right = content[1];

        if (left === undefined)
            throw new Error(`${this.name()} should have a 'left' property defined`);

        if (right === undefined)
            throw new Error(`${this.name()} should have a 'right' property defined`);

        return this.evaluate(obj, left, right, context);
    }

    protected evaluate(_obj: any, _left: any, _right: any, _context: Context) : any {
        throw new Error(`Not implemented`);
    }
}