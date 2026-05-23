// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { execSync } from "child_process";
import { OpVariadic } from "../opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("process.exec", 1); }

    public evaluate(_obj: any, values: Array<any>, _context: Context) : any {
        const cmd = values.join("");
        return execSync(cmd).toString();
    }
}