// SPDX-License-Identifier: MIT

import * as Path from "path";
import { Token  } from "./Token";
import { TokenType } from "./TokenType";
import { LexerError  } from "./LexerError";

const CH_TAB        =   9;
const CH_LF         =  10;
const CH_CR         =  13;
const CH_SPACE      =  32;
const CH_DQUOTE     =  34;
const CH_STAR       =  42;
const CH_COMMA      =  44;
const CH_MINUS      =  45;
const CH_DOT        =  46;
const CH_SLASH      =  47;
const CH_0          =  48;
const CH_1          =  49;
const CH_2          =  50;
const CH_3          =  51;
const CH_4          =  52;
const CH_5          =  53;
const CH_6          =  54;
const CH_7          =  55;
const CH_8          =  56;
const CH_9          =  57;
const CH_COLON      =  58;
const CH_SEMICOLON  =  59;
const CH_AT         =  64;
const CH_A          =  65;
const CH_Z          =  90;
const CH_LBRACKET   =  91;
const CH_BACKSLASH  =  92;
const CH_RBRACKET   =  93;
const CH_UNDERSCORE =  95;
const CH_a          =  97;
const CH_e          = 101;
const CH_f          = 102;
const CH_g          = 103;
const CH_i          = 105;
const CH_l          = 108;
const CH_n          = 110;
const CH_r          = 114;
const CH_s          = 115;
const CH_t          = 116;
const CH_u          = 117;
const CH_z          = 122;
const CH_LBRACE     = 123;
const CH_RBRACE     = 125;

export class Lexer {
    #buffer: Buffer;
    #lineIndex : number = 1;
    #bufferIndex: number = 0;
    #dirName: string;
    #fileName: string;
    #lastBufferIndex: number = 0;

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

    public constructor(input: Buffer, fileName: string) {
        this.#buffer = input;
        this.#fileName = fileName;
        this.#dirName = Path.dirname(fileName);
    }

    // Restores the buffer position to the start of the last token read so
    // the next readToken() call returns the same token again.
    // Note: #lineIndex is NOT restored. Callers must only put back tokens
    // that contain no newlines (all single-line tokens satisfy this).
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

            if (ch === CH_SPACE || ch === CH_TAB || ch === CH_CR || ch === CH_LF) {
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
        case CH_COMMA:
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Comma, startIndex, startIndex);

        case CH_COLON:
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Colon, startIndex, startIndex);

        case CH_MINUS:
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Minus, startIndex, startIndex);

        case CH_SEMICOLON:
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Semicolon, startIndex, startIndex);

        case CH_AT:
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.At, startIndex, startIndex);

        case CH_LBRACKET:
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.LeftBracket, startIndex, startIndex);

        case CH_RBRACKET:
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.RightBracket, startIndex, startIndex);

        case CH_LBRACE:
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.LeftCurlyBracket, startIndex, startIndex);

        case CH_RBRACE:
            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.RightCurlyBracket, startIndex, startIndex);

        case CH_DQUOTE: {
            bufferIndex++;

            if (bufferIndex >= bufferLength) {
                throw new LexerError("Unexpected end of buffer", this.#fileName, this.#lineIndex);
            }

            // check for multiline string """
            if (buffer[bufferIndex] === CH_DQUOTE) {
                if (bufferIndex + 1 >= bufferLength || buffer[bufferIndex + 1] !== CH_DQUOTE) {
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

                    if (ch === CH_DQUOTE && bufferIndex + 2 < bufferLength &&
                        buffer[bufferIndex + 1] === CH_DQUOTE && buffer[bufferIndex + 2] === CH_DQUOTE) {
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
                    if (ch === CH_DQUOTE) // end of string
                        break;

                    if (ch === CH_BACKSLASH) {
                        escaped = true;
                        bufferIndex++;
                        continue;
                    }
                }

                escaped = false;

                if (bufferIndex >= bufferLength) {
                    throw new LexerError("Unexpected end of buffer", this.#fileName, this.#lineIndex);
                }

                if (ch === CH_LF) {
                    throw new LexerError("String could not have line break", this.#fileName, this.#lineIndex);
                }

                bufferIndex++;
                ch = buffer[bufferIndex];
            }

            this.#bufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.String, startIndex + 1, bufferIndex - 1);
        }

        // digits 0-9
        case CH_0: case CH_1: case CH_2: case CH_3: case CH_4:
        case CH_5: case CH_6: case CH_7: case CH_8: case CH_9: {
            let isValidChar = true;

            while (isValidChar) {
                bufferIndex++;

                if (bufferIndex >= bufferLength)
                    break;

                ch = buffer[bufferIndex];
                isValidChar = (ch >= CH_0 && ch <= CH_9) || ch === CH_DOT;
            }

            this.#bufferIndex = bufferIndex;
            return new Token(buffer, TokenType.Number, startIndex, bufferIndex - 1);
        }

        // identifiers
        default: {
            // valid identifier start: A-Z a-z _ * .
            let isValidChar = (ch >= CH_A && ch <= CH_Z) || (ch >= CH_a && ch <= CH_z)
                           || ch === CH_UNDERSCORE || ch === CH_STAR || ch === CH_DOT;

            if (!isValidChar) {
                throw new LexerError("Unexpected character: " + String.fromCharCode(ch),
                                     this.#fileName, this.#lineIndex);
            }

            while (isValidChar) {
                bufferIndex++;

                if (bufferIndex >= bufferLength)
                    break;

                // valid identifier continuation: A-Z a-z _ 0-9 . * -
                ch = buffer[bufferIndex];
                isValidChar = (ch >= CH_A && ch <= CH_Z) || (ch >= CH_a && ch <= CH_z)
                           || ch === CH_UNDERSCORE || (ch >= CH_0 && ch <= CH_9)
                           || ch === CH_DOT || ch === CH_STAR || ch === CH_MINUS;
            }

            this.#bufferIndex = bufferIndex;

            const identifierLength = bufferIndex - startIndex;

            if (identifierLength === 2) {
                // as
                if (buffer[startIndex] === CH_a && buffer[startIndex + 1] === CH_s) {
                    return new Token(buffer, TokenType.As, startIndex, bufferIndex - 1);
                }
            } else if (identifierLength === 4) {
                // true
                if (buffer[startIndex] === CH_t && buffer[startIndex + 1] === CH_r &&
                    buffer[startIndex + 2] === CH_u && buffer[startIndex + 3] === CH_e) {
                    return new Token(buffer, TokenType.True, startIndex, bufferIndex - 1);
                }
                // null
                if (buffer[startIndex] === CH_n && buffer[startIndex + 1] === CH_u &&
                    buffer[startIndex + 2] === CH_l && buffer[startIndex + 3] === CH_l) {
                    return new Token(buffer, TokenType.Null, startIndex, bufferIndex - 1);
                }
            } else if (identifierLength === 5) {
                // false
                if (buffer[startIndex] === CH_f && buffer[startIndex + 1] === CH_a &&
                    buffer[startIndex + 2] === CH_l && buffer[startIndex + 3] === CH_s &&
                    buffer[startIndex + 4] === CH_e) {
                    return new Token(buffer, TokenType.False, startIndex, bufferIndex - 1);
                }
                // using
                if (buffer[startIndex] === CH_u && buffer[startIndex + 1] === CH_s &&
                    buffer[startIndex + 2] === CH_i && buffer[startIndex + 3] === CH_n &&
                    buffer[startIndex + 4] === CH_g) {
                    return new Token(buffer, TokenType.Using, startIndex, bufferIndex - 1);
                }
            }

            return new Token(buffer, TokenType.Identifier, startIndex, bufferIndex - 1);
        }
        }
    }
}
