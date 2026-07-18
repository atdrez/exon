// SPDX-License-Identifier: MIT

import { BaseEval } from "../baseEval";

export default class Component extends BaseEval {
    constructor() { super("csv.decode"); }

    protected shouldWrapString() : boolean {
        return false;
    }

    protected evaluateContent(content: any) : any {
        const lines = String(content).split(/\r?\n/).filter(l => l.trim() !== '');

        if (lines.length === 0)
            return [];

        const headers = this.parseLine(lines[0]);
        const result: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseLine(lines[i]);
            const row: Record<string, string> = {};

            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = (j < values.length) ? values[j] : '';
            }

            result.push(row);
        }

        return result;
    }

    private parseLine(line: string): string[] {
        const fields: string[] = [];
        let i = 0;

        while (i < line.length) {
            if (line[i] === '"') {
                let field = '';
                i++;
                while (i < line.length) {
                    if (line[i] === '"' && line[i + 1] === '"') {
                        field += '"';
                        i += 2;
                    } else if (line[i] === '"') {
                        i++;
                        break;
                    } else {
                        field += line[i++];
                    }
                }
                fields.push(field);
                if (line[i] === ',') i++;
            } else {
                const end = line.indexOf(',', i);
                if (end === -1) {
                    fields.push(line.slice(i));
                    break;
                }
                fields.push(line.slice(i, end));
                i = end + 1;
            }
        }

        return fields;
    }
}
