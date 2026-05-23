// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";
import { getMessage } from "../../ipc";

export default class Component extends Base {
    constructor() { super("ipc.getmessage"); }

    public resolve(_obj: any, _context: Context): any {
        return getMessage();
    }
}
