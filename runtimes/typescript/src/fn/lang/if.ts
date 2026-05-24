// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("if"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        if (obj.condition === undefined)
            throw new Error(`${this.name()} should have a 'condition' property defined`);

        if (obj.then === undefined)
            throw new Error(`${this.name()} should have a 'then' property defined`);

        const condition = context.resolve(obj.condition);

        if (condition)
            return context.resolve(obj.then);

        if (obj.else !== undefined)
            return context.resolve(obj.else);

        return null;
    }
}
