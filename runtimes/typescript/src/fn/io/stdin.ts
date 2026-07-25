// SPDX-License-Identifier: MIT

import * as FS from "fs";
import { StringDecoder } from "string_decoder";

const CHUNK_SIZE = 65536;

let buffer = "";
let eof = false;

function sleep(ms: number): void {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const decoder = new StringDecoder("utf8");

function fill(): boolean {
    if (eof) {
        return false;
    }

    const chunk = Buffer.alloc(CHUNK_SIZE);

    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            const bytesRead = FS.readSync(0, chunk, 0, CHUNK_SIZE, null);

            if (bytesRead === 0) {
                eof = true;
                // Flush out any remaining bytes held by the decoder
                buffer += decoder.end(); 
                return false;
            }

            // StringDecoder ensures multi-byte characters aren't broken up
            buffer += decoder.write(chunk.subarray(0, bytesRead));
            return true;
        } catch (e: any) {
            if (e.code === "EAGAIN" || e.code === "EWOULDBLOCK") {
                sleep(10);
                continue;
            }
            throw e;
        }
    }
    throw new Error("stdin: resource temporarily unavailable");
}

export function readLine(): string | null {
    let newlineIndex = buffer.indexOf("\n");

    while (newlineIndex === -1 && fill()) {
        newlineIndex = buffer.indexOf("\n");
    }

    if (newlineIndex !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) {
            line = line.slice(0, -1);
        }

        return line;
    }

    if (buffer.length > 0) {
        const line = buffer;
        buffer = "";
        return line;
    }

    return null;
}

export function readAll(): string {
    while (fill()) {
        // keep reading until EOF
    }

    const content = buffer;
    buffer = "";
    return content;
}