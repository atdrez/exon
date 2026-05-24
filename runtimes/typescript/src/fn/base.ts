// SPDX-License-Identifier: MIT

import { IScript, Context } from "../IScript";

export class Base implements IScript {
    #name: string;

    public name() : string {
        return this.#name;
    }

    constructor(name: string) {
        this.#name = `fn.${name}`;
    }

    public resolve(_obj: any, _context: Context) : any {
        throw new Error(`Not implemented`);
    }
}