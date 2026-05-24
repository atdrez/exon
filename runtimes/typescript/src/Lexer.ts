// SPDX-License-Identifier: MIT

import * as Path from "path";
import { Token  } from "./Token";
import { TokenType } from "./TokenType";
import { LexerError  } from "./LexerError";

const CH_LF = 10;
const CH_SLASH = 47;
const CH_STAR = 42;

export class Lexer {
    #buffer: Buffer;
    #lineIndex : number = 1;
    #bufferIndex: number = 0;
    #dirName: string;
    #fileName: string;
    #lastBufferIndex: number = 0;
    #usingNamespaces: string[] = [];

    public get available() : boolean {
        return this.#bufferIndex < this.#buffer.length;
    }

    public get lineIndex() : number {
        return this.#lineIndex;
    }

    public get fileName() : string {
        return this.#fileName;
    }

    public get dirName() : string {
        return this.#dirName;
    }

    public get usingNamespaces() : readonly string[] {
        return this.#usingNamespaces;
    }

    public addUsing(namespace: string) : void {
        this.#usingNamespaces.push(namespace);
    }

    public constructor(input: Buffer, fileName: string) {
        this.#buffer = input;
        this.#fileName = fileName;
        this.#dirName = Path.dirname(fileName);
    }

    public putTokenBack() : void {
        this.#bufferIndex = this.#lastBufferIndex;
    }

    public readToken() : Token {
        const buffer = this.#buffer;
        const bufferLength = buffer.length;
        let bufferIndex = this.#bufferIndex;

        // skip whitespaces
        while (bufferIndex < bufferLength) {
            let ch = buffer[bufferIndex];

            if (ch === 32 || ch === 9 || ch === 13 || ch === 10) {
                if (ch === CH_LF)
                    this.#lineIndex++;

                bufferIndex++;
            } else if (ch === CH_SLASH) {
                // skip one-line comment

                if (bufferIndex >= bufferLength - 1)
                    break;

                if (buffer[bufferIndex + 1] !== CH_SLASH)
                    break;

                while (bufferIndex < bufferLength) {
                    if (buffer[bufferIndex] === CH_LF)
                        break;

                    bufferIndex++;
                }
            } else if (ch === CH_STAR &&
                       bufferIndex + 2 < bufferLength &&
                       buffer[bufferIndex + 1] === CH_STAR &&
                       buffer[bufferIndex + 2] === CH_STAR) {
                // skip multiline comment *** ... ***
                bufferIndex += 3;

                while (true) {
                    if (bufferIndex >= bufferLength) {
                        throw new LexerError("Unexpected end of buffer inside multiline comment",
                            this.#fileName, this.#lineIndex);
                    }

                    ch = buffer[bufferIndex];

                    if (ch === CH_LF)
                        this.#lineIndex++;

                    if (ch === CH_STAR &&
                        bufferIndex + 2 < bufferLength &&
                        buffer[bufferIndex + 1] === CH_STAR &&
                        buffer[bufferIndex + 2] === CH_STAR) {
                        bufferIndex += 3;
                        break;
                    }

                    bufferIndex++;
                }
            } else {
                break;
            }
        }

        this.#bufferIndex = bufferIndex;
        this.#lastBufferIndex = bufferIndex;

        // reached end of buffer
        if (bufferIndex >= bufferLength) {
            return new Token(buffer, TokenType.None, 0, 0);
        }

        const startIndex = bufferIndex;
        let ch = buffer[startIndex];

        switch (ch) {
        case 44: // ','
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Comma, startIndex, startIndex);

        case 58: // ':'
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Colon, startIndex, startIndex);

        case 45: // '-'
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Minus, startIndex, startIndex);

        case 59: // ';'
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Semicolon, startIndex, startIndex);

        case 64: // '@'
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.At, startIndex, startIndex);

        case 91: // '['
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.LeftBracket, startIndex, startIndex);

        case 93: // ']'
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.RightBracket, startIndex, startIndex);

        case 123: // '{'
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.LeftCurlyBracket, startIndex, startIndex);

        case 125: // '}'
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.RightCurlyBracket, startIndex, startIndex);

        case 34: { // '"'
            bufferIndex++;

            if (bufferIndex >= bufferLength) {
                throw new LexerError("Unexpected end of buffer", this.#fileName, this.#lineIndex);
            }

            // check for multiline string """
            if (buffer[bufferIndex] === 34) {
                if (bufferIndex + 1 >= bufferLength || buffer[bufferIndex + 1] !== 34) {
                    // empty single-line string ""
                    this.#bufferIndex = bufferIndex + 1;
                    return new Token(buffer, TokenType.String, startIndex + 1, bufferIndex - 1);
                }

                // skip second and third opening "
                bufferIndex += 2;
                const contentStart = bufferIndex;

                while (true) {
                    if (bufferIndex >= bufferLength) {
                        throw new LexerError("Unexpected end of buffer", this.#fileName, this.#lineIndex);
                    }

                    ch = buffer[bufferIndex];

                    if (ch === CH_LF)
                        this.#lineIndex++;

                    if (ch === 34 && bufferIndex + 2 < bufferLength &&
                        buffer[bufferIndex + 1] === 34 && buffer[bufferIndex + 2] === 34) {
                        break;
                    }

                    bufferIndex++;
                }

                this.#bufferIndex = bufferIndex + 3;
                return new Token(buffer, TokenType.MultilineString, contentStart, bufferIndex - 1);
            }

            ch = buffer[bufferIndex];

            let escaped = false;

            // read single-line string
            while (true) {
                if (!escaped) {
                    if (ch === 34) // end of string
                        break;

                    if (ch === 92) { // '\'
                        escaped = true;
                        bufferIndex++;
                        continue;
                    }
                }

                escaped = false;

                if (bufferIndex >= bufferLength) {
                    throw new LexerError("Unexpected end of buffer", this.#fileName, this.#lineIndex);
                }

                // LF
                if (ch === 10) {
                    throw new LexerError("String could not have line break", this.#fileName, this.#lineIndex);
                }

                bufferIndex++;
                ch = buffer[bufferIndex];
            }

            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.String, startIndex + 1, bufferIndex - 1);
        }

        // digits 0-9
        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57: {
            let isValidChar = true;

            while (isValidChar) {
                bufferIndex++;

                if (bufferIndex >= bufferLength)
                    break;

                // 0-9 .
                ch = buffer[bufferIndex];
                isValidChar = (ch >= 48 && ch <= 57) || (ch === 46);
            }

            this.#bufferIndex = bufferIndex;
            return new Token(buffer, TokenType.Number, startIndex, bufferIndex - 1);
        }

        // identifiers
        default: {
             // A-Z a-z _ * .
            let isValidChar = ((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || (ch === 95) || (ch === 42) || (ch === 46));

            if (!isValidChar) {
                throw new LexerError("Unexpected character: " + String.fromCharCode(ch),
                                     this.#fileName, this.#lineIndex);
            }

            while (isValidChar) {
                bufferIndex++;

                if (bufferIndex >= bufferLength)
                    break;

                // A-Z a-z _ 0-9 . * -
                ch = buffer[bufferIndex];
                isValidChar = ((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || (ch === 95) || (ch >= 48 && ch <= 57) || (ch === 46) || (ch === 42) || (ch === 45));
            }

            this.#bufferIndex = bufferIndex;

            const identifierLength = bufferIndex - startIndex;

            if (identifierLength === 4) {
                // true
                if (buffer[startIndex] === 116 && buffer[startIndex + 1] === 114 &&
                    buffer[startIndex + 2] === 117 && buffer[startIndex + 3] === 101)
                    return new Token(buffer, TokenType.True, startIndex, bufferIndex - 1);

                // null
                if (buffer[startIndex] === 110 && buffer[startIndex + 1] === 117 &&
                    buffer[startIndex + 2] === 108 && buffer[startIndex + 3] === 108)
                    return new Token(buffer, TokenType.Null, startIndex, bufferIndex - 1);
            } else if (identifierLength === 5) {
                // false
                if (buffer[startIndex] === 102 && buffer[startIndex + 1] === 97 &&
                    buffer[startIndex + 2] === 108 && buffer[startIndex + 3] === 115 &&
                    buffer[startIndex + 4] === 101)
                    return new Token(buffer, TokenType.False, startIndex, bufferIndex - 1);
            }

            return new Token(buffer, TokenType.Identifier, startIndex, bufferIndex - 1);
        }
        }
    }
}
