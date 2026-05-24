// SPDX-License-Identifier: MIT

import * as FS from "fs";
import { Base } from "./base";
import { Context } from "../IScript";
import { Parser } from "../Parser";
import { Resolver } from "../Resolver";
import { RuntimeOptions } from "../RuntimeOptions";

type PatternSet = {
    start: string;
    end: string;
    regionStart: string;
    regionEnd: string;
};

const NAMED_PATTERNS: Record<string, PatternSet> = {
    js:   { start: '//#exon',      end: '//#endexon',     regionStart: '/*',   regionEnd: '*/'  },
    html: { start: '<!--#exon-->', end: '<!--#endexon-->', regionStart: '<!--', regionEnd: '-->' },
};

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default class Component extends Base {
    constructor() { super("preprocess"); }

    public resolve(obj: any, context: Context): any {
        let content: string;
        let sourceFile: string;

        if (typeof obj.content === "string") {
            content = obj.content;
            sourceFile = context.location.file;
        } else if (typeof obj.file === "string") {
            content = FS.readFileSync(obj.file).toString();
            sourceFile = obj.file;
        } else {
            throw new Error(`${this.name()}: expected 'content' (string) or 'file' (path)`);
        }

        const ps = this.resolvePattern(obj);
        return this.preprocess(content, sourceFile, ps, context);
    }

    private resolvePattern(obj: any): PatternSet {
        const hasStyle   = typeof obj.style === 'string';
        const hasPattern = obj.pattern != null && typeof obj.pattern === 'object';

        if (hasStyle && hasPattern) {
            throw new Error(`${this.name()}: 'style' and 'pattern' are mutually exclusive`);
        }

        if (hasPattern) {
            const { start, end, regionStart, regionEnd } = obj.pattern;
            if (!start || !end || !regionStart || !regionEnd) {
                throw new Error(`${this.name()}: pattern requires all of: start, end, regionStart, regionEnd`);
            }
            return { start, end, regionStart, regionEnd };
        }

        const style = hasStyle ? obj.style : 'js';
        if (!NAMED_PATTERNS[style]) {
            throw new Error(`${this.name()}: unknown style '${style}', expected 'js' or 'html'`);
        }
        return NAMED_PATTERNS[style];
    }

    private preprocess(content: string, sourceFile: string, ps: PatternSet, context: Context): string {
        const regex = this.buildRegex(ps);
        return content.replace(regex, (_full, start, comment, _old, end) => {
            const exonCode = this.extractExonCode(comment, ps);
            const result = this.evaluate(exonCode, sourceFile, context);
            const resultStr = this.resultToString(result);
            const normalized = resultStr.endsWith('\n') ? resultStr : resultStr + '\n';
            return start + comment + normalized + end;
        });
    }

    private buildRegex(ps: PatternSet): RegExp {
        const s  = escapeRegex(ps.start);
        const e  = escapeRegex(ps.end);
        const rs = escapeRegex(ps.regionStart);
        const re = escapeRegex(ps.regionEnd);
        return new RegExp(`(${s}\\r?\\n)([ \\t]*${rs}[\\s\\S]*?${re}\\r?\\n?)([\\s\\S]*?)([ \\t]*${e})`, 'g');
    }

    private extractExonCode(comment: string, ps: PatternSet): string {
        const rStart = new RegExp('^[ \\t]*' + escapeRegex(ps.regionStart) + '\\r?\\n?');
        const rEnd   = new RegExp('\\r?\\n?[ \\t]*' + escapeRegex(ps.regionEnd) + '\\r?\\n?$');
        return comment.replace(rStart, '').replace(rEnd, '');
    }

    private evaluate(exonCode: string, sourceFile: string, context: Context): any {
        const buffer = Buffer.from(exonCode, 'latin1');
        const repository = context.getScriptRepository();
        const parser = new Parser(repository, []);
        const options = new RuntimeOptions({ run: false, test: false });
        const resolver = new Resolver(repository, options);
        return resolver.resolve(parser.parseFromBuffer(buffer, sourceFile));
    }

    private resultToString(value: any): string {
        if (typeof value === 'string') {
            return value;
        }

        if (value instanceof Object) {
            return JSON.stringify(value, null, 4);
        }

        return String(value);
    }
}
