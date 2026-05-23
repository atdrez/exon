// SPDX-License-Identifier: MIT

import { Context } from "../IScript";
import { OpUnary } from "./opUnary";

export default class Component extends OpUnary {
    constructor() { super("parameter"); }

    public evaluate(obj: any, value: any, context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} expected string argument`);

        return context.params()?.[value];
    }
}
