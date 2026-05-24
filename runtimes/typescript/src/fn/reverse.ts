// SPDX-License-Identifier: MIT

import { Context } from "../Context";
import { OpVariadic } from "./opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("reverse", 1); }

    protected evaluate(obj: any, values: Array<any>, _context: Context) : any {
        let content = values;

        if (content.length == 1) {
            if (!Array.isArray(content))
                throw new Error(`${this.name()} expected array argument`);

            content = content[0];
        }

        return [...content].reverse();
    }
}