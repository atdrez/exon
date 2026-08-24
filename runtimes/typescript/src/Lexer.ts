// SPDX-License-Identifier: MIT

import * as Path from "path";
import { Token } from "./Token";
import { TokenType } from "./TokenType";
import { LexerError  } from "./LexerError";

export class Lexer {
    private _buffer: Buffer;
    private _token: Token;
    private _pushBackToken: Token;
    private _lineIndex : number = 1;
    private _bufferIndex: number = 0;
    private _dirName: string;
    private _fileName: string;
    private _lastBufferIndex: number = 0;
    private _nextBufferIndex: number = 0;
    private _hasPushBackToken: boolean = false;

    public constructor(input: Buffer, fileName: string) {
        this._buffer = input;
        this._fileName = fileName;
        this._token = new Token(input);
        this._pushBackToken = new Token(input);
        this._dirName = Path.dirname(fileName);
    }

    public isAvailable() : boolean {
        return this._bufferIndex < this._buffer.length;
    }

    public getLineIndex() : number {
        return this._lineIndex;
    }

    public getFileName() : string {
        return this._fileName;
    }

    public getDirectoryName() : string {
        return this._dirName;
    }

    public getTokenString() : string {
        return this._token.toString();
    }

    public getTokenNumber() : number {
        return this._token.toNumber();
    }

    // Restores the buffer position to the start of the last token read so
    // the next readToken() call returns the same token again. The token is set
    // aside so that read can restore it instead of re-scanning the buffer -
    // which also means #lineIndex stays correct for tokens spanning newlines,
    // where a re-scan would have counted them twice.
    public putTokenBack() : void {
        if (this._hasPushBackToken)
            return;

        this._pushBackToken.copyFrom(this._token);
        this._nextBufferIndex = this._bufferIndex;
        this._bufferIndex = this._lastBufferIndex;
        this._hasPushBackToken = true;
    }

    public readToken() : TokenType {
        if (this._hasPushBackToken) {
            this._hasPushBackToken = false;
            this._bufferIndex = this._nextBufferIndex;
            this._token.copyFrom(this._pushBackToken);
            return this._token.getTokenType();
        }

        const buffer = this._buffer;
        const bufferLength = buffer.length;
        let bufferIndex = this._bufferIndex;

        // skip comments and whitespaces
        while (bufferIndex < bufferLength) {
            let ch = buffer[bufferIndex];
            const isWhiteSpace = (ch === 32 || ch === 9 || ch === 13 || ch === 10); // space, tab, CR, LF

            // skip whitespaces
            if (isWhiteSpace) {
                if (ch === 10 /* LF */)
                    this._lineIndex++;

                bufferIndex++;
                continue;
            }

            // skip one-line comment
            if (ch === 47 /* / */) {
                if (bufferIndex >= bufferLength - 1)
                    break;

                if (buffer[bufferIndex + 1] !== 47 /* / */)
                    break;

                while (bufferIndex < bufferLength) {
                    if (buffer[bufferIndex] === 10 /* LF */)
                        break;

                    bufferIndex++;
                }
                continue;
            }

            // skip multiline comment *** ... ***
            if (ch === 42 /* * */ &&
                bufferIndex + 2 < bufferLength &&
                buffer[bufferIndex + 1] === 42 /* * */ &&
                buffer[bufferIndex + 2] === 42 /* * */) {

                bufferIndex += 3;

                while (true) {
                    if (bufferIndex >= bufferLength) {
                        throw new LexerError("Unexpected end of buffer inside multiline comment",
                            this._fileName, this._lineIndex);
                    }

                    ch = buffer[bufferIndex];

                    if (ch === 10 /* LF */)
                        this._lineIndex++;

                    if (ch === 42 /* * */ &&
                        bufferIndex + 2 < bufferLength &&
                        buffer[bufferIndex + 1] === 42 /* * */ &&
                        buffer[bufferIndex + 2] === 42 /* * */) {
                        bufferIndex += 3;
                        break;
                    }

                    bufferIndex++;
                }
            } else {
                break;
            }
        }

        this._bufferIndex = bufferIndex;
        this._lastBufferIndex = bufferIndex;

        // reached end of buffer
        if (bufferIndex >= bufferLength) {
            return this._token.assign(TokenType.None, 0, 0);
        }

        const startIndex = bufferIndex;

        let ch = buffer[startIndex];

        // strings
        if (ch === 34 /* " */) {
            bufferIndex++;

            if (bufferIndex >= bufferLength) {
                throw new LexerError("Unexpected end of buffer", this._fileName, this._lineIndex);
            }

            // check for multiline string """
            if (buffer[bufferIndex] === 34 /* " */) {
                if (bufferIndex + 1 >= bufferLength || buffer[bufferIndex + 1] !== 34 /* " */) {
                    // empty single-line string ""
                    this._bufferIndex = bufferIndex + 1;
                    return this._token.assign(TokenType.String, startIndex + 1, bufferIndex - 1);
                }

                // skip second and third opening "
                bufferIndex += 2;
                const contentStart = bufferIndex;

                while (true) {
                    if (bufferIndex >= bufferLength) {
                        throw new LexerError("Unexpected end of buffer", this._fileName, this._lineIndex);
                    }

                    ch = buffer[bufferIndex];

                    if (ch === 10 /* LF */)
                        this._lineIndex++;

                    if (ch === 34 /* " */ && bufferIndex + 2 < bufferLength &&
                        buffer[bufferIndex + 1] === 34 /* " */ && buffer[bufferIndex + 2] === 34 /* " */) {
                        break;
                    }

                    bufferIndex++;
                }

                this._bufferIndex = bufferIndex + 3;
                return this._token.assign(TokenType.MultilineString, contentStart, bufferIndex - 1);
            }

            ch = buffer[bufferIndex];

            let escaped = false;

            // read single-line string
            while (true) {
                if (!escaped) {
                    if (ch === 34 /* " */) // end of string
                        break;

                    if (ch === 92 /* \ */) {
                        escaped = true;
                        bufferIndex++;
                        continue;
                    }
                }

                escaped = false;

                if (bufferIndex >= bufferLength) {
                    throw new LexerError("Unexpected end of buffer", this._fileName, this._lineIndex);
                }

                if (ch === 10 /* LF */) {
                    throw new LexerError("String could not have line break", this._fileName, this._lineIndex);
                }

                bufferIndex++;
                ch = buffer[bufferIndex];
            }

            this._bufferIndex = bufferIndex + 1;
            return this._token.assign(TokenType.String, startIndex + 1, bufferIndex - 1);
        }

        // numbers
        const isDigit = (ch >= 48 && ch <= 57); // 0-9
        if (isDigit) {
            let dotCount = 0;
            let isValidChar = true;
            while (isValidChar) {
                bufferIndex++;

                if (bufferIndex >= bufferLength)
                    break;

                ch = buffer[bufferIndex];

                const isDot = ch === 46 /* . */;
                if (isDot) {
                    if (dotCount > 0) {
                        throw new LexerError("Invalid float found", this._fileName, this._lineIndex);
                    }
                    dotCount++;
                }

                isValidChar = isDot || (ch >= 48 && ch <= 57) /* 0-9 */;
            }

            this._bufferIndex = bufferIndex;
            const numberType = dotCount > 0 ? TokenType.Float : TokenType.Integer;
            return this._token.assign(numberType, startIndex, bufferIndex - 1);
        }

        // identifiers
        const isIdentifier =
            ((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122)) // A-Z a-z
            || ch === 43 /* + */
            || ch === 46 /* . */ || ch === 95 /* _ */ || ch === 42 /* * */;
        if (isIdentifier) {
            let isValidChar = true;
            while (isValidChar) {
                bufferIndex++;

                if (bufferIndex >= bufferLength)
                    break;

                // valid identifier continuation: A-Z a-z 0-9 _ * . +
                ch = buffer[bufferIndex];

                isValidChar =
                    ((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122)) // A-Z a-z
                    || (ch >= 48 && ch <= 57) // 0-9
                    || ch === 46 /* . */ || ch === 95 /* _ */ || ch === 42 /* * */ || ch === 45 /* - */;
            }

            this._bufferIndex = bufferIndex;

            const identifierLength = bufferIndex - startIndex;

            if (identifierLength === 2) {
                // as
                if (buffer[startIndex] === 97 /* a */ && buffer[startIndex + 1] === 115 /* s */) {
                    return this._token.assign(TokenType.As, startIndex, bufferIndex - 1);
                }
            } else if (identifierLength === 4) {
                // true
                if (buffer[startIndex] === 116 /* t */ && buffer[startIndex + 1] === 114 /* r */ &&
                    buffer[startIndex + 2] === 117 /* u */ && buffer[startIndex + 3] === 101 /* e */) {
                    return this._token.assign(TokenType.True, startIndex, bufferIndex - 1);
                }
                // null
                if (buffer[startIndex] === 110 /* n */ && buffer[startIndex + 1] === 117 /* u */ &&
                    buffer[startIndex + 2] === 108 /* l */ && buffer[startIndex + 3] === 108 /* l */) {
                    return this._token.assign(TokenType.Null, startIndex, bufferIndex - 1);
                }
            } else if (identifierLength === 5) {
                // false
                if (buffer[startIndex] === 102 /* f */ && buffer[startIndex + 1] === 97 /* a */ &&
                    buffer[startIndex + 2] === 108 /* l */ && buffer[startIndex + 3] === 115 /* s */ &&
                    buffer[startIndex + 4] === 101 /* e */) {
                    return this._token.assign(TokenType.False, startIndex, bufferIndex - 1);
                }
                // using
                if (buffer[startIndex] === 117 /* u */ && buffer[startIndex + 1] === 115 /* s */ &&
                    buffer[startIndex + 2] === 105 /* i */ && buffer[startIndex + 3] === 110 /* n */ &&
                    buffer[startIndex + 4] === 103 /* g */) {
                    return this._token.assign(TokenType.Using, startIndex, bufferIndex - 1);
                }
            }

            return this._token.assign(TokenType.Identifier, startIndex, bufferIndex - 1);
        }

        // special tokens
        const specialToken = Token.parseSpecialToken(ch);
        if (specialToken != TokenType.None) {
            this._bufferIndex = bufferIndex + 1;
            return this._token.assign(specialToken, startIndex, startIndex);
        }

        // invalid token
        throw new LexerError("Unexpected character: " + String.fromCharCode(ch),
            this._fileName, this._lineIndex);
    }
}
