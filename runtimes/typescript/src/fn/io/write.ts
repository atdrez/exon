// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpVariadic } from "../opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("io.write", 1); }

    public evaluate(_obj: any, values: Array<any>, _context: Context) : any {
        process.stdout.write(values.join(""));
    }
}
