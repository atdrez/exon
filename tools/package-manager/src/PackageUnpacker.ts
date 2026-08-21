// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";
import * as tar from "tar";

export interface UnpackLogger {
    info(message: string): void;
}

const consoleLogger: UnpackLogger = {
    info: (message) => console.log(message),
};

function defaultOutputDir(archivePath: string): string {
    const base = Path.basename(archivePath);
    const name = base.endsWith(".expkg") ? base.slice(0, -".expkg".length) : base;
    return Path.join(Path.dirname(archivePath), name);
}

export async function unpackArchive(
    archivePath: string,
    outputDir: string | undefined,
    logger: UnpackLogger = consoleLogger
): Promise<string> {
    if (!FileSystem.existsSync(archivePath)) {
        throw new Error(`Archive not found: ${archivePath}`);
    }

    const resolvedOutput = outputDir ?? defaultOutputDir(archivePath);

    FileSystem.mkdirSync(resolvedOutput, { recursive: true });

    await tar.x({ file: archivePath, cwd: resolvedOutput });

    logger.info(`Unpacked to ${resolvedOutput}`);
    return resolvedOutput;
}
