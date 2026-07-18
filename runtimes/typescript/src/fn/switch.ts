// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("switch"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        if (obj.value === undefined)
            throw new Error(`${this.name()} should have value`);

        const value = context.resolve(obj.value);
        const content = obj.__content__;

        if (!(content instanceof Array) || content.length === 0) {
            throw new Error(`${this.name()} requires at least one case`);
        }

        for (let i = 0; i < content.length - 1; i += 2) {
            const caseValue = context.resolve(content[i]);

            if (caseValue === value) {
                return context.resolve(content[i + 1]);
            }
        }

        if (content.length % 2 !== 0) {
            return context.resolve(content[content.length - 1]);
        }

        return null;
    }
}