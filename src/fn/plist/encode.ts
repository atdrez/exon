// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpUnary } from "../opUnary";

const HEADER =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"' +
    ' "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n';

const FOOTER = '\n</plist>';

export default class Component extends OpUnary {
    constructor() { super("plist.encode"); }

    public evaluate(_obj: any, content: any, _context: Context) : any {
        if (content === null || content === undefined || !(content instanceof Object))
            throw new Error(`${this.name()} content must be an object`);

        return HEADER + this.encodeValue(content, '') + FOOTER;
    }

    private encodeValue(value: any, indent: string) : string {
        if (value === null || value === undefined) {
            return `${indent}<string/>`;
        }

        if (typeof value === 'boolean') {
            return `${indent}<${value}/>`;
        }

        if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                return `${indent}<integer>${value}</integer>`;
            }
            return `${indent}<real>${value}</real>`;
        }

        if (typeof value === 'string') {
            return `${indent}<string>${this.escapeText(value)}</string>`;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return `${indent}<array/>`;
            }
            const inner = value.map(item => this.encodeValue(item, indent + '\t')).join('\n');
            return `${indent}<array>\n${inner}\n${indent}</array>`;
        }

        if (value instanceof Object) {
            const entries = Object.entries(value);
            if (entries.length === 0) {
                return `${indent}<dict/>`;
            }
            const inner = entries.map(([k, v]) => {
                const key = `${indent}\t<key>${this.escapeText(k)}</key>`;
                const val = this.encodeValue(v, indent + '\t');
                return `${key}\n${val}`;
            }).join('\n');
            return `${indent}<dict>\n${inner}\n${indent}</dict>`;
        }

        return `${indent}<string>${this.escapeText(String(value))}</string>`;
    }

    private escapeText(s: string) : string {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
