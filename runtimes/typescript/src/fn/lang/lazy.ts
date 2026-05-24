// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("lazy"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        const content = obj.__content__[0]

        if (content === undefined)
            throw new Error(`${this.name()} should have a parameter`);

        return context.resolve(content);
    }
}
