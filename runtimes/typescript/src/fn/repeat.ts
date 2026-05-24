// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("repeat"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        if (typeof obj.count === undefined)
            throw new Error(`${this.name()}.count property is invalid`);

        const num = context.resolve(obj.count);

        if (typeof num !== "number")
            throw new Error(`${this.name()}.count should be a valid number`);

        if (obj.content === undefined)
            throw new Error(`${this.name()}.content property is invalid`);

        let statement = obj.content;

        if (typeof statement === "object")
            statement = context.resolve(obj.content);

        const result: any[] = [];

        for (let i = 0; i < num; i++) {
            result.push(statement);
        }

        return result;
    }
}
