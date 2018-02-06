/*
 * Copyright (c) 2017 Adriano Tinoco d'Oliveira Rezende
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
 * KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as Path from "path";
import { Token  } from "./Token";
import { TokenType } from "./TokenType";
import { LexerError  } from "./LexerError";

export class Lexer {
    private m_Buffer: Buffer;
    private m_LineIndex : number = 1;
    private m_BufferIndex: number = 0;
    private m_DirName: string;
    private m_FileName: string;
    private m_LastBufferIndex: number = 0;

    public get available() : boolean {
        return this.m_BufferIndex < this.m_Buffer.length;
    }

    public get lineIndex() : number {
        return this.m_LineIndex;
    }

    public get fileName() : string {
        return this.m_FileName;
    }

    public get dirName() : string {
        return this.m_DirName;
    }

    public constructor(input: Buffer, fileName: string) {
        this.m_Buffer = input;
        this.m_FileName = fileName;
        this.m_DirName = Path.dirname(fileName);
    }

    public putTokenBack() : void {
        this.m_BufferIndex = this.m_LastBufferIndex;
    }

    public readToken() : Token {
        const buffer = this.m_Buffer;
        const bufferLength = buffer.length;
        let bufferIndex = this.m_BufferIndex;

        // skip whitespaces
        while (bufferIndex < bufferLength) {
            let ch = buffer[bufferIndex];

            if (ch === 32 || ch === 9 || ch === 13 || ch === 10) {
                if (ch === 10)
                    this.m_LineIndex++;

                bufferIndex++;
            } else if (ch === 35) {
                // skip one-line comment
                while (bufferIndex < bufferLength) {
                    if (buffer[bufferIndex] === 10)
                        break;

                    bufferIndex++;
                }
            } else {
                break;
            }
        }

        this.m_BufferIndex = bufferIndex;
        this.m_LastBufferIndex = bufferIndex;

        // reached end of buffer
        if (bufferIndex >= bufferLength) {
            return new Token(buffer, TokenType.None, 0, 0);
        }

        const startIndex = bufferIndex;
        let ch = buffer[startIndex];

        switch (ch) {
        case 44: // ','
            this.m_BufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Comma, startIndex, startIndex);

        case 58: // ':'
            this.m_BufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Colon, startIndex, startIndex);

        case 59: // ';'
            this.m_BufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.Semicolon, startIndex, startIndex);

        case 91: // '['
            this.m_BufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.LeftBracket, startIndex, startIndex);

        case 93: // ']'
            this.m_BufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.RightBracket, startIndex, startIndex);

        case 123: // '{'
            this.m_BufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.LeftCurlyBracket, startIndex, startIndex);

        case 125: // '}'
            this.m_BufferIndex = bufferIndex + 1;
            return new Token(buffer, TokenType.RightCurlyBracket, startIndex, startIndex);

        case 34: { // '"'
            bufferIndex++;

            if (bufferIndex >= bufferLength) {
                throw new LexerError("Unexpected end of buffer", this.m_LineIndex);
            }

            ch = buffer[bufferIndex];

            let escaped = false;

            // read string
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
                    throw new LexerError("Unexpected end of buffer", this.m_LineIndex);
                }

                // LF
                if (ch === 10) {
                    throw new LexerError("String could not have line break", this.m_LineIndex);
                }

                bufferIndex++;
                ch = buffer[bufferIndex];
            }

            this.m_BufferIndex = bufferIndex + 1;
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

            this.m_BufferIndex = bufferIndex;
            return new Token(buffer, TokenType.Number, startIndex, bufferIndex - 1);
        }

        // identifiers
        default: {
             // A-Z a-z _
            let isValidChar = ((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || (ch === 95));

            if (!isValidChar) {
                throw new LexerError("Unexpected character: " + String.fromCharCode(ch),
                                     this.m_LineIndex);
            }

            while (isValidChar) {
                bufferIndex++;

                if (bufferIndex >= bufferLength)
                    break;

                // A-Z a-z _ 0-9 .
                ch = buffer[bufferIndex];
                isValidChar = ((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || (ch === 95) || (ch >= 48 && ch <= 57) || (ch === 46));
            }

            this.m_BufferIndex = bufferIndex;

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
