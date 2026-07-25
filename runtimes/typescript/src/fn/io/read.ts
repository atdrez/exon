// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";
import { readAll } from "./stdin";

export default class Component extends Base {
    constructor() { super("io.read"); }

    public resolve(_obj: any, _context: Context) : any {
        return readAll();
    }
}
