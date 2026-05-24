// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("pass"); }

    public resolve(_obj: any, _context: Context) : any {
        return undefined;
    }
}
