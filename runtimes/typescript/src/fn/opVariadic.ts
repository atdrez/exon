// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export class OpVariadic extends Base {
    #minArguments: number = 2;
    #maxArguments: number = -1;

    constructor(name: string, min: number, max: number = -1) {
        super(name);
        this.#minArguments = min;
        this.#maxArguments = max;
    }

    public resolve(obj: any, context: Context) : any {
        const content = obj.__content__;

        if (!(content instanceof Array))
            throw new Error(`${this.name()} content should be an array`);

        const min = this.#minArguments;

        if (content.length < min)
            throw new Error(`${this.name()} should have at least ${min} arguments`);

        const max = this.#maxArguments;

        if (max >= 0 && content.length > max)
            throw new Error(`${this.name()} should have maximum of ${max} arguments`);

        return this.evaluate(obj, content, context);
    }

    protected evaluate(_obj: any, _values: Array<any>, _context: Context) : any {
        throw new Error(`Not implemented`);
    }
}