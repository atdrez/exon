// SPDX-License-Identifier: MIT

import { TokenType } from "./TokenType";

export class Token {
    public readonly tokenType: TokenType;

    #buffer: Buffer;
    #startIndex: number;
    #endIndex: number;
    #tokenValue: string | undefined;

    constructor(buffer: Buffer, tokenType: TokenType, start: number, end: number) {
        this.#buffer = buffer;
        this.#startIndex = start;
        this.#endIndex = end;
        this.tokenType = tokenType;
        this.#tokenValue = undefined;
    }

    public getChar(index: number): number {
        const i = index + this.#startIndex;

        if (i < this.#startIndex || i > this.#endIndex)
            throw new Error("Invalid buffer index");

        return this.#buffer[i];
    }

    public toString() : string {
        if (this.tokenType === TokenType.None)
            return "<invalid>";

        if (this.#tokenValue !== undefined)
            return this.#tokenValue;

        const raw = this.#buffer.toString("utf-8", this.#startIndex, this.#endIndex + 1);

        if (this.tokenType === TokenType.String) {
            this.#tokenValue = Token.#processEscape(raw);
        }
        else if (this.tokenType === TokenType.MultilineString) {
            this.#tokenValue = Token.#processEscape(Token.#dedent(raw));
        }
        else {
            this.#tokenValue = raw;
        }

        return  this.#tokenValue;
    }

    static #processEscape(raw: string) : string {
        let result = "";
        let i = 0;
        while (i < raw.length) {
            if (raw[i] === "\\" && i + 1 < raw.length) {
                i++;
                switch (raw[i]) {
                    case "n":  result += "\n"; break;
                    case "t":  result += "\t"; break;
                    case "r":  result += "\r"; break;
                    case "\\": result += "\\"; break;
                    case "\"": result += "\""; break;
                    default:   result += "\\" + raw[i]; break;
                }
            } else {
                result += raw[i];
            }
            i++;
        }
        return result;
    }

    // Dedents a multiline string's raw content using the minimum common
    // leading whitespace (space or tab) shared by its lines.
    static #dedent(raw: string) : string {
        let text = raw;
        let hasLeadingBreak = false;

        if (text.startsWith("\r\n")) {
            text = text.slice(2);
            hasLeadingBreak = true;
        } else if (text.startsWith("\n")) {
            text = text.slice(1);
            hasLeadingBreak = true;
        }

        // single line
        if (text.indexOf("\n") < 0)
            return text;

        const lines = text.split("\n");
        const dedentStart = hasLeadingBreak ? 0 : 1;

        // find common indent
        let indent : string | undefined;
        for (let i = dedentStart; i < lines.length; i++) {
            const line = lines[i];

            // ignore empty line
            if (line.length === 0 || line === "\r")
                continue;

            let end = 0;

            while (end < line.length && (line[end] === " " || line[end] === "\t")) {
                end++;
            }

            const lineIndent = line.slice(0, end);

            if (indent === undefined) {
                indent = lineIndent;
                continue;
            }

            let common = 0;
            const maxLength = Math.min(indent.length, lineIndent.length);

            while (common < maxLength && indent[common] === lineIndent[common]) {
                common++;
            }

            indent = indent.slice(0, common);

            if (indent.length === 0)
                break;
        }

        // no common indent found, return text
        if (indent === undefined || indent.length === 0)
            return text;

        let result = "";

        for (let i = 0; i < lines.length; i++) {
            if (i > 0)
                result += "\n";

            const line = lines[i];

            if (i < dedentStart || line.length === 0 || line === "\r") {
                result += line;
            }
            else {
                result += line.slice(indent.length);
            }
        }

        if (hasLeadingBreak) {
            if (result.endsWith("\r\n"))
                return result.slice(0, -2);

            if (result.endsWith("\n"))
                return result.slice(0, -1);
        }

        return result;
    }
}
