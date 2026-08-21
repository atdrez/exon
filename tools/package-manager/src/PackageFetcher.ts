// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";
import * as OS from "os";
import { unpackArchive, stripExpkgExtension, type UnpackLogger } from "./PackageUnpacker";

function filenameFromUrl(url: string): string {
    return Path.basename(new URL(url).pathname);
}

function defaultOutputDir(cwd: string, url: string): string {
    return Path.join(cwd, stripExpkgExtension(filenameFromUrl(url)));
}

export async function fetchAndUnpack(
    url: string,
    outputDir: string | undefined,
    logger: UnpackLogger = { info: (message) => console.log(message) }
): Promise<string> {
    const cwd = process.cwd();
    const resolvedOutput = outputDir ?? defaultOutputDir(cwd, url);

    logger.info(`Downloading ${url} ...`);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = filenameFromUrl(url);
    const tmpDir = FileSystem.mkdtempSync(Path.join(OS.tmpdir(), "exon-fetch-"));
    const tmpFile = Path.join(tmpDir, filename.length > 0 ? filename : "package.expkg");

    try {
        FileSystem.writeFileSync(tmpFile, buffer);
        return await unpackArchive(tmpFile, resolvedOutput, logger);
    } finally {
        FileSystem.rmSync(tmpDir, { recursive: true, force: true });
    }
}
