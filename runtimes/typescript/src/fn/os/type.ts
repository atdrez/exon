// SPDX-License-Identifier: MIT

import * as os from "os";
import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("os.type"); }

    public resolve(_obj: any, _context: Context): any {
        return os.type();
    }
}
