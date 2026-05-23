// SPDX-License-Identifier: MIT

import { Context } from "../IScript";
import { Base } from "./base";

export default class Component extends Base {
    constructor() { super("foreach"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        if (obj.data === undefined)
            throw new Error(`${this.name()}.data property is invalid`);

        let rawContent = context.resolve(obj.data);

        if (!(rawContent instanceof Array) && (typeof rawContent !== "object" || rawContent === null)) {
            rawContent = context.resolve(obj.data);
        }

        const isArray = rawContent instanceof Array;
        const isObject = !isArray && typeof rawContent === "object" && rawContent !== null;

        if (!isArray && !isObject) {
            throw new Error(`${this.name()}.data is not an array or object`);
        }

        const statement = obj.do;

        if (statement === undefined) {
            throw new Error(`${this.name()}.do property is invalid`);
        }

        const result: any[] = [];

        const includeNull = (obj.includeNull === true);

        if (isArray) {
            for (const rawItem of rawContent) {
                const value = context.resolve(rawItem);
                const response = context.resolve(statement, { value });

                if (includeNull || (response !== null && response !== undefined)) {
                    result.push(response);
                }
            }
        } else {
            for (const [key, rawItem] of Object.entries(rawContent)) {
                const value = context.resolve(rawItem);
                const response = context.resolve(statement, { value: { key, value } });

                if (includeNull || (response !== null && response !== undefined)) {
                    result.push(response);
                }
            }
        }

        return result;
    }
}
