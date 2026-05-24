// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("cond"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        const content = obj.__content__;

        if (!(content instanceof Array) || content.length === 0) {
            throw new Error(`${this.name()} requires at least one argument`);
        }

        for (let i = 0; i < content.length - 1; i += 2) {
            const condition = context.resolve(content[i]);

            if (condition) {
                return context.resolve(content[i + 1]);
            }
        }

        if (content.length % 2 !== 0) {
            return context.resolve(content[content.length - 1]);
        }

        return null;
    }
}
