// SPDX-License-Identifier: MIT

import { IScript, Context } from "../IScript";

export abstract class Base implements IScript {
    private _name: string;

    public name() : string {
        return this._name;
    }

    constructor(name: string) {
        this._name = `fn.${name}`;
    }

    public abstract resolve(_obj: any, _context: Context) : any;
}