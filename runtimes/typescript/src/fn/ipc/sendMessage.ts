// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";

export default class Component extends Base {
    constructor() { super("ipc.sendmessage"); }

    public resolve(obj: any, _context: Context): any {
        const content = obj.__content__;

        if (!(content instanceof Array) || content.length !== 1)
            throw new Error(`${this.name()} should have one argument`);

        const message = content[0];

        if (process.send) {
            process.send(message);
        }

        return message;
    }
}
