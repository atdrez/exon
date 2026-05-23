// SPDX-License-Identifier: MIT

import { TokenType } from "./TokenType";

export class Token {
    public get tokenType() : TokenType {
        return this.#tokenType;
    }

    #buffer: Buffer;
    #startIndex: number;
    #endIndex: number;
    #tokenType: number;

    constructor(buffer: Buffer, tokenType: TokenType, start: number, end: number) {
        this.#buffer = buffer;
        this.#startIndex = start;
        this.#endIndex = end;
        this.#tokenType = tokenType;
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

        const raw = this.#buffer.toString("utf-8", this.#startIndex, this.#endIndex + 1);

        if (this.tokenType !== TokenType.String)
            return raw;

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
}
