// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("wrapper"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context) : any {
        return context.resolve(obj.content);
    }
}
