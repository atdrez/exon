// SPDX-License-Identifier: MIT

import * as FS from "fs";
import { Base } from "./base";
import { Context } from "../IScript";
import { Parser } from "../Parser";
import { Resolver } from "../Resolver";
import { RuntimeOptions } from "../RuntimeOptions";

// Matches a region: //#exon<newline> <block-comment> <non-commented-content> //#endexon
const REGION_PATTERN = /(\/\/#exon\r?\n)(\/\*[\s\S]*?\*\/\r?\n?)([\s\S]*?)(\/\/#endexon)/g;

export default class Component extends Base {
    constructor() { super("preprocess"); }

    public resolve(obj: any, context: Context): any {
        let content: string;

        if (typeof obj.content === "string") {
            content = obj.content;
        } else if (typeof obj.file === "string") {
            content = FS.readFileSync(obj.file).toString();
        } else {
            throw new Error(`${this.name()}: expected 'content' (string) or 'file' (path)`);
        }

        return this.preprocess(content, context);
    }

    private preprocess(content: string, context: Context): string {
        return content.replace(REGION_PATTERN, (_full, start, comment, _old, end) => {
            const exonCode = this.extractExonCode(comment);
            const result = this.evaluate(exonCode, context);
            const resultStr = this.resultToString(result);
            const normalized = resultStr.endsWith('\n') ? resultStr : resultStr + '\n';
            return start + comment + normalized + end;
        });
    }

    private extractExonCode(comment: string): string {
        return comment
            .replace(/^\/\*\r?\n?/, '')
            .replace(/\r?\n?\*\/\r?\n?$/, '');
    }

    private evaluate(exonCode: string, context: Context): any {
        const buffer = Buffer.from(exonCode, 'latin1');
        const repository = context.getScriptRepository();
        const parser = new Parser(repository, []);
        const options = new RuntimeOptions({ run: false, test: false });
        const resolver = new Resolver(repository, options);
        return resolver.resolve(parser.parseFromBuffer(buffer, '<preprocess>'));
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
