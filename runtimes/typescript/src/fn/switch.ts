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

        const result = context.resolve(obj.value);
        const code = `${result}`;

        const statement = obj[code];

        if (statement !== undefined)
            return context.resolve(statement);

        if (obj.__default !== undefined)
            return context.resolve(obj.__default);
    }
}