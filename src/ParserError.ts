// SPDX-License-Identifier: MIT

import { Lexer } from "./Lexer"

export class ParserError extends Error {
    constructor(message: string, lexer: Lexer) {
        super(`[${lexer.fileName}:${lexer.lineIndex}]: ${message}`);
    }
}
