// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("xml.encode"); }

    public evaluate(obj: any, content: any, _context: Context) : any {
        if (!(content instanceof Object))
            throw new Error(`${this.name()} content must be an object`);

        const inner = Object.entries(content)
            .map(([key, val]) => this.encodeNode(key, val))
            .join('');

        return obj.root ? `<${obj.root}>${inner}</${obj.root}>` : inner;
    }

    private encodeNode(tag: string, value: any) : string {
        if (Array.isArray(value))
            return value.map(item => this.encodeNode(tag, item)).join('');

        if (value instanceof Object) {
            const children = Object.entries(value)
                .map(([k, v]) => this.encodeNode(k, v))
                .join('');
            return `<${tag}>${children}</${tag}>`;
        }

        return `<${tag}>${this.escapeText(String(value))}</${tag}>`;
    }

    private escapeText(s: string) : string {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}