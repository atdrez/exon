// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";
import { readLine } from "./stdin";

export default class Component extends Base {
    constructor() { super("io.readLine"); }

    public resolve(_obj: any, _context: Context) : any {
        return readLine();
    }
}
