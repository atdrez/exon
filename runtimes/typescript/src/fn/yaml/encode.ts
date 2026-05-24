// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("yaml.encode"); }

    public evaluate(_obj: any, content: any, _context: Context) : any {
        if (!(content instanceof Object))
            throw new Error(`${this.name()} content must be an object`);

        return this.encodeValue(content, 0);
    }

    private encodeValue(value: any, indent: number) : string {
        if (Array.isArray(value))
            return value.map(item => {
                const prefix = ' '.repeat(indent) + '- ';
                if (item instanceof Object) {
                    const lines = this.encodeObject(item, indent + 2);
                    return prefix + lines.trimStart();
                }
                return prefix + this.encodeScalar(item);
            }).join('\n');

        if (value instanceof Object)
            return this.encodeObject(value, indent);

        return this.encodeScalar(value);
    }

    private encodeObject(obj: any, indent: number) : string {
        return Object.entries(obj).map(([key, val]) => {
            const pad = ' '.repeat(indent);
            if (Array.isArray(val)) {
                const items = this.encodeValue(val, indent + 2);
                return `${pad}${key}:\n${items}`;
            }
            if (val instanceof Object) {
                const nested = this.encodeObject(val, indent + 2);
                return `${pad}${key}:\n${nested}`;
            }
            return `${pad}${key}: ${this.encodeScalar(val)}`;
        }).join('\n');
    }

    private encodeScalar(value: any) : string {
        if (typeof value === 'string') {
            if (/[:#\[\]{},&*?|<>=!%@`\n'"]/.test(value) || value.trim() !== value)
                return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
            return value;
        }
        return String(value);
    }
}