// SPDX-License-Identifier: MIT

import { OpVariadic } from "../opVariadic";
import { Context } from "../../IScript";

export default class Component extends OpVariadic {
    constructor() { super("and", 2); }

    public evaluate(obj: any, values: Array<any>, _context: Context): any {
        let result = values[0];

        for (let i = 1; i < values.length; i++) {
            result = result && values[i];
        }

        return result;
    }
}
