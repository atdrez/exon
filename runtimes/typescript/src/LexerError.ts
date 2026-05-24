// SPDX-License-Identifier: MIT

export class LexerError extends Error {
    constructor(message: string, filename: string, line: number) {
        super(`[${filename}:${line}]: ${message}`);
    }
}
