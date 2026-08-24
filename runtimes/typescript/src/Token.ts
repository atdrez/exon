// SPDX-License-Identifier: MIT

import { TokenType } from "./TokenType";

export class Token {
    private _buffer: Buffer;
    private _tokenType: TokenType = TokenType.None;
    private _startIndex: number = 0;
    private _endIndex: number = -1;
    private _tokenValue: string | undefined = undefined;

    constructor(buffer: Buffer) {
        this._buffer = buffer;
    }

    public getTokenType() : TokenType {
        return this._tokenType;
    }

    public assign(tokenType: TokenType, start: number, end: number) : TokenType {
        this._tokenType = tokenType;
        this._startIndex = start;
        this._endIndex = end;
        this._tokenValue = undefined;
        return tokenType;
    }

    public copyFrom(other: Token) : void {
        this._buffer = other._buffer;
        this.assign(other._tokenType, other._startIndex, other._endIndex);
        this._tokenValue = other._tokenValue;
    }

    static parseSpecialToken(ch: number) : TokenType {
        switch (ch) {
            case 44:  return TokenType.Comma;
            case 58:  return TokenType.Colon;
            case 45:  return TokenType.Minus;
            case 59:  return TokenType.Semicolon;
            case 64:  return TokenType.At;
            case 91:  return TokenType.LeftBracket;
            case 93:  return TokenType.RightBracket;
            case 123: return TokenType.LeftCurlyBracket;
            case 125: return TokenType.RightCurlyBracket;
            default:  return TokenType.None;
        }
    }

    public toString() : string {
        if (this._tokenType === TokenType.None)
            return "<invalid>";

        if (this._tokenValue !== undefined)
            return this._tokenValue;

        const raw = this._buffer.toString("utf8", this._startIndex, this._endIndex + 1);

        if (this._tokenType === TokenType.String) {
            this._tokenValue = Token.processEscape(raw);
        }
        else if (this._tokenType === TokenType.MultilineString) {
            this._tokenValue = Token.processEscape(Token.dedent(raw));
        }
        else {
            this._tokenValue = raw;
        }

        return this._tokenValue;
    }

    public toNumber() : number {
        const buffer = this._buffer;
        const start = this._startIndex;
        const end = this._endIndex;
        const length = end - start + 1;

        if (this._tokenType === TokenType.Float || length > 15) {
            // floats or huge numbers fallback to parseFloat
            return parseFloat(this._buffer.toString("utf8", this._startIndex, this._endIndex + 1));
        }

        if (this._tokenType !== TokenType.Integer) {
            return 0; // invalid number type
        }

        let result = 0;
        for (let i = start; i <= end; i++) {
            result = result * 10 + (buffer[i] - 48 /* 0 */);
        }
        return result;
    }

    private static processEscape(raw: string) : string {
        const backslashIndex = raw.indexOf("\\");

        if (backslashIndex < 0)
            return raw;

        const len = raw.length;
        let result = raw.slice(0, backslashIndex);

        for (let i = backslashIndex; i < len; i++) {
            const c = raw.charCodeAt(i);

            if (c !== 92 /* \ */ || i + 1 >= len) {
                result += raw[i];
                continue;
            }

            i++;
            switch (raw.charCodeAt(i)) {
                case 110: result += "\n"; break;
                case 116: result += "\t"; break;
                case 114: result += "\r"; break;
                case 92:  result += "\\"; break;
                case 34:  result += "\""; break;
                default:
                    result += "\\";
                    result += raw[i];
                    break;
            }
        }

        return result;
    }

    // Dedents a multiline string's raw content using the minimum common
    // leading whitespace (space or tab) shared by its lines.
    private static dedent(raw: string) : string {
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
