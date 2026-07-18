// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("csv.encode"); }

    public evaluate(_obj: any, content: any, _context: Context) : any {
        if (!Array.isArray(content))
            throw new Error(`${this.name()} content must be an array of objects`);

        const headers: string[] = [];

        for (const row of content) {
            if (!(row instanceof Object) || Array.isArray(row))
                throw new Error(`${this.name()} each element must be an object`);

            for (const key of Object.keys(row)) {
                if (!headers.includes(key))
                    headers.push(key);
            }
        }

        const escape = (val: any): string => {
            const s = (val === null || val === undefined) ? '' : String(val);

            if (s.includes(',') || s.includes('"') || s.includes('\n'))
                return `"${s.replace(/"/g, '""')}"`;

            return s;
        };

        const lines = [headers.join(',')];

        for (const row of content)
            lines.push(headers.map(h => escape(row[h])).join(','));

        return lines.join('\n');
    }
}
