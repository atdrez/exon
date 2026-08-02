// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";
import * as OS from "os";
import * as tar from "tar";
import type { PackageConfig } from "exon-runtime";
import { MODULES_DIR_NAME } from "exon-runtime";

import { compressExon, compressJs } from "./Compressor";

export interface PackLogger {
    info(message: string): void;
}

export interface PackOptions {
    compress?: boolean;
    outputDir?: string;
}

const consoleLogger: PackLogger = {
    info: (message) => console.log(message),
};

const EXCLUDED_ENTRIES = new Set([MODULES_DIR_NAME, "node_modules", ".git"]);

function archiveNameFor(config: PackageConfig): string {
    const name = config.name ?? "package";
    return config.version !== undefined ? `${name}-${config.version}.expkg` : `${name}.expkg`;
}

async function stageCompressed(sourcePath: string, targetPath: string): Promise<void> {
    if (FileSystem.statSync(sourcePath).isDirectory()) {
        FileSystem.mkdirSync(targetPath, { recursive: true });

        for (const child of FileSystem.readdirSync(sourcePath)) {
            await stageCompressed(Path.join(sourcePath, child), Path.join(targetPath, child));
        }
        return;
    }

    const extension = Path.extname(sourcePath).toLowerCase();

    if (extension === ".js") {
        const source = FileSystem.readFileSync(sourcePath, "utf-8");
        FileSystem.writeFileSync(targetPath, await compressJs(source, sourcePath));
        return;
    }

    if (extension === ".exon") {
        const source = FileSystem.readFileSync(sourcePath, "utf-8");
        FileSystem.writeFileSync(targetPath, compressExon(source));
        return;
    }

    FileSystem.copyFileSync(sourcePath, targetPath);
}

export async function packProject(projectDir: string, config: PackageConfig,
    logger: PackLogger = consoleLogger, options: PackOptions = {}): Promise<string> {
    const archiveName = archiveNameFor(config);
    const outputDir = options.outputDir ?? projectDir;
    const archivePath = Path.join(outputDir, archiveName);

    FileSystem.mkdirSync(Path.dirname(archivePath), { recursive: true });

    const entries = FileSystem.readdirSync(projectDir).filter(
        (entry) => !EXCLUDED_ENTRIES.has(entry) && !entry.endsWith(".expkg")
    );

    if (options.compress === true) {
        const stagingDir = FileSystem.mkdtempSync(Path.join(OS.tmpdir(), "exon-pack-"));

        try {
            for (const entry of entries) {
                await stageCompressed(Path.join(projectDir, entry), Path.join(stagingDir, entry));
            }

            await tar.c({ gzip: true, file: archivePath, cwd: stagingDir }, entries);
        } finally {
            FileSystem.rmSync(stagingDir, { recursive: true, force: true });
        }
    } else {
        await tar.c({ gzip: true, file: archivePath, cwd: projectDir }, entries);
    }

    logger.info(`Created ${archiveName}`);
    return archivePath;
}
