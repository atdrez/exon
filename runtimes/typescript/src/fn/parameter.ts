// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("parameter"); }

    public resolve(obj: any, context: Context) : any {
        const content = obj.__content__;

        let name : string | undefined;

        if (content === undefined) {
            name = "value"; // default key='value'
        } else {
            if (!(content instanceof Array) || content.length !== 1)
                throw new Error(`${this.name()} invalid arguments (expected 1 param)`);

            name = content[0];
        }

        if (typeof name !== "string")
            throw new Error(`${this.name()} expected string argument`);
 
        return context.params()?.[name];

    }
}