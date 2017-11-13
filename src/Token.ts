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

import { TokenType } from "./TokenType";

export class Token {
    public get tokenType() : TokenType {
        return this.m_TokenType;
    }

    private m_Buffer: Buffer;
    private m_Start: number;
    private m_End: number;
    private m_TokenType: number;

    constructor(buffer: Buffer, tokenType: TokenType, start: number, end: number) {
        this.m_Buffer = buffer;
        this.m_Start = start;
        this.m_End = end;
        this.m_TokenType = tokenType;
    }

    public getChar(index: number): number {
        const i = index + this.m_Start;

        if (i < this.m_Start || i > this.m_End)
            throw new Error("Invalid buffer index");

        return this.m_Buffer[i];
    }

    public toString() : string {
        if (this.tokenType === TokenType.None)
            return "<invalid>";

        return this.m_Buffer.toString("utf-8", this.m_Start, this.m_End + 1);
    }
}
