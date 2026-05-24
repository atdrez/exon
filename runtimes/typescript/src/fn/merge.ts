// SPDX-License-Identifier: MIT
import { Context } from "../Context";
import { OpVariadic } from "./opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("merge", 0); }

    public evaluate(obj: any, values: Array<any>, _context: Context) : any {
        let result : any = {};

        for (const target of values) {
            result = { ...result,  ...(<any>target) };
        }

        return result;
    }
}