// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("table"); }

    public resolve(obj: any, _context: Context) : any {
        const columns = obj.columns;
        const content = obj.__content__ ?? [];

        if (!(columns instanceof Array) || columns.length === 0)
            throw new Error(`${this.name()} requires a non-empty columns array`);

        for (const column of columns) {
            if (typeof column !== "string")
                throw new Error(`${this.name()} columns must be strings`);
        }

        if (!(content instanceof Array))
            throw new Error(`${this.name()} content should be an array`);

        if (content.length % columns.length !== 0)
            throw new Error(`${this.name()} content length must be a multiple of the number of columns`);

        const result: Record<string, any>[] = [];

        for (let i = 0; i < content.length; i += columns.length) {
            const row: Record<string, any> = {};

            for (let j = 0; j < columns.length; j++)
                row[columns[j]] = content[i + j];

            result.push(row);
        }

        return result;
    }
}
