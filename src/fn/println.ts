// SPDX-License-Identifier: MIT

import { Context } from "../Context";
import { OpVariadic } from "./opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("println", 1); }

    public evaluate(obj: any, values: Array<any>, context: Context) : any {
        if (!context.options.shouldPrintOutput()) {
            // print just works in run/test modes
            return console.log(values.join(""));
        }
    }
}