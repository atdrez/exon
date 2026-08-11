// SPDX-License-Identifier: MIT

// Compresses a JavaScript source file: strips comments and minifies.
export async function compressJs(source: string, fileName?: string): Promise<string> {
    const { minify } = await import("terser");
    const result = await minify(source, {
        compress: true,
        mangle: true,
        format: { comments: false },
        parse: { bare_returns: true },
    });

    if (result.code === undefined) {
        throw new Error(`Failed to compress ${fileName ?? "js file"}`);
    }

    return result.code;
}

const NUMBER_CONTINUE = /[0-9.]/;
const IDENTIFIER_START = /[A-Za-z_*.+]/;
const IDENTIFIER_CONTINUE = /[A-Za-z0-9_.*-]/;

// Punctuation tokens that are always exactly one character and never enter a
// continuation loop, so they can never merge with a neighboring token.
const PUNCTUATION = new Set([",", ":", "-", ";", "@", "[", "]", "{", "}"]);

function skipGap(source: string, start: number): number {
    const n = source.length;
    let i = start;

    while (i < n) {
        const ch = source[i];

        if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
            i++;
            continue;
        }

        if (ch === "/" && source[i + 1] === "/") {
            i += 2;

            while (i < n && source[i] !== "\n") {
                i++;
            }

            continue;
        }

        if (ch === "*" && source[i + 1] === "*" && source[i + 2] === "*") {
            const end = source.indexOf("***", i + 3);

            if (end < 0) {
                throw new Error("Unexpected end of buffer inside multiline comment");
            }

            i = end + 3;
            continue;
        }

        break;
    }

    return i;
}

function skipString(source: string, start: number): number {
    const n = source.length;
    let i = start + 1;

    if (i >= n) {
        throw new Error("Unexpected end of buffer");
    }

    if (source[i] === "\"") {
        if (i + 1 >= n || source[i + 1] !== "\"") {
            // empty single-line string ""
            return i + 1;
        }

        // multiline string """ ... """
        const end = source.indexOf("\"\"\"", i + 2);

        if (end < 0) {
            throw new Error("Unexpected end of buffer inside multiline string");
        }

        return end + 3;
    }

    while (i < n) {
        const ch = source[i];

        if (ch === "\\") {
            i += 2;
            continue;
        }

        if (ch === "\"") {
            return i + 1;
        }

        if (ch === "\n") {
            throw new Error("String could not have line break");
        }

        i++;
    }

    throw new Error("Unexpected end of buffer");
}

type TokenKind = "number" | "identifier" | "other";

function needsSeparator(prevKind: TokenKind, nextChar: string): boolean {
    if (prevKind === "number") {
        return NUMBER_CONTINUE.test(nextChar);
    }

    if (prevKind === "identifier") {
        return IDENTIFIER_CONTINUE.test(nextChar);
    }

    return false;
}

// Compresses a Exon source file: strips comments and whitespaces
export function compressExon(source: string): string {
    const n = source.length;
    let out = "";
    let prevKind: TokenKind = "other";
    let i = 0;

    while (i < n) {
        const gapEnd = skipGap(source, i);

        if (gapEnd > i) {
            i = gapEnd;

            if (i < n && needsSeparator(prevKind, source[i])) {
                out += " ";
            }

            continue;
        }

        const ch = source[i];

        if (ch === "\"") {
            const stringEnd = skipString(source, i);
            out += source.slice(i, stringEnd);
            prevKind = "other";
            i = stringEnd;
            continue;
        }

        if (PUNCTUATION.has(ch)) {
            out += ch;
            prevKind = "other";
            i++;
            continue;
        }

        if (ch >= "0" && ch <= "9") {
            const start = i;
            i++;

            while (i < n && NUMBER_CONTINUE.test(source[i])) {
                i++;
            }

            out += source.slice(start, i);
            prevKind = "number";
            continue;
        }

        if (IDENTIFIER_START.test(ch)) {
            const start = i;
            i++;

            while (i < n && IDENTIFIER_CONTINUE.test(source[i])) {
                i++;
            }

            out += source.slice(start, i);
            prevKind = "identifier";
            continue;
        }

        throw new Error(`Unexpected character: ${ch}`);
    }

    return out;
}
