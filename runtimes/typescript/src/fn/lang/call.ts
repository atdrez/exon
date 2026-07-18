// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";
import { Closure } from "./closure";

export default class Component extends Base {
    constructor() { super("call"); }

    public isDeferred(): boolean { return true; }

    public resolve(obj: any, context: Context): any {
        const fn = obj.__content__[0];

        if (fn === undefined)
            throw new Error(`${this.name()} requires a 'fn' property`);

        const closure = context.isObjectBinding(fn)
            ? context.resolveBinding(fn['__bind__'], fn['__bindFile__'] ?? '')
            : context.resolve(fn);

        if (!(closure instanceof Closure))
            throw new Error(`${this.name()}.fn must resolve to a fn.closure instance`);

        const keys = Object.keys(obj);
        const args : Record<string, any> = {};

        for (const key of keys) {
            if (key.startsWith("__"))
                continue;

            args[key] = context.resolve(obj[key])
        }

        return closure.resolve(args);
    }
}
