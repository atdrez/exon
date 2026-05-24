// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("coalesce"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        const content = obj.__content__;

        if (!(content instanceof Array) || content.length === 0) {
            throw new Error(`${this.name()} requires at least one argument`);
        }

        for (const item of content) {
            const value = context.resolve(item);

            if (value !== null && value !== undefined) {
                return value;
            }
        }

        return null;
    }
}
