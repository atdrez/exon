// SPDX-License-Identifier: MIT
import { Context } from "../Context";
import { OpUnary } from "./opUnary";

export default class Component extends OpUnary {
    constructor() { super("assert"); }

    public evaluate(obj: any, value: any, _context: Context) : any {
        if (value)
            return;

        if (obj.message === undefined)
            throw new Error();

        if (typeof obj.message !== "string")
            throw new Error(`${this.name()}.message must be string`);

        throw new Error(obj.message);
    }
}