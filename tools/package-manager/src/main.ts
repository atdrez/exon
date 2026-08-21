// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";
import * as OS from "os";
import { spawnSync } from "child_process";
import { findProject, PACKAGE_FILE_NAME } from "exon-runtime";

import { installDependencies, installNodeDependencies, uninstallAll, uninstallDependency } from "./PackageInstaller";
import { packProject } from "./PackagePacker";
import { PackagePublisher } from "./PackagePublisher";
import { unpackArchive } from "./PackageUnpacker";
import { fetchAndUnpack } from "./PackageFetcher";

const USAGE = "Usage: expm install [dir]\n       expm uninstall [name]\n"
    + "       expm pack [dir] [--compress] [--output <dir>]\n"
    + "       expm publish [dir] [--compress] [--registry <url>]\n"
    + "       expm unpack <file.expkg> [folder-path]\n"
    + "       expm fetch <url> [folder-path]";

function extractFlag(args: string[], flag: string): { rest: string[]; present: boolean } {
    return { rest: args.filter((arg) => arg !== flag), present: args.includes(flag) };
}

function extractValueFlag(args: string[], flag: string): { rest: string[]; value: string | undefined } {
    const index = args.indexOf(flag);
    if (index === -1) return { rest: args, value: undefined };
    const value = args[index + 1];
    const rest = args.filter((_, i) => i !== index && i !== index + 1);
    return { rest, value };
}

function reportError(message: string): never {
    console.error("[ERROR]:");
    console.error(message);
    return process.exit(1) as never;
}

function runPostinstall(projectDir: string, command: string): void {
    console.log(`Running postinstall: ${command}`);

    const result = spawnSync(command, { cwd: projectDir, stdio: "inherit", shell: true });

    if (result.error) {
        reportError(result.error.message);
    }

    if ((result.status ?? 0) !== 0) {
        process.exit(result.status ?? 1);
    }
}

async function runInstall(args: string[]): Promise<void> {
    const cwd = process.cwd();
    const targetDir = args[0] !== undefined ? Path.resolve(cwd, args[0]) : cwd;
    const project = findProject(targetDir);

    if (project === null) {
        reportError(`No ${PACKAGE_FILE_NAME} found in ${targetDir}`);
        return;
    }

    try {
        const transitiveNodeDependencies = await installDependencies(project.packagePath, project.config, project.modulesDir);

        const nodeDependencies = { ...transitiveNodeDependencies, ...project.config.nodeDependencies };
        installNodeDependencies(project.projectDir, nodeDependencies);
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
        return;
    }

    const postinstall = project.config.scripts.postinstall;

    if (postinstall !== undefined) {
        runPostinstall(project.projectDir, postinstall);
    }
}

function runUninstall(args: string[]): void {
    const cwd = process.cwd();
    const project = findProject(cwd);

    if (project === null) {
        reportError(`No ${PACKAGE_FILE_NAME} found in ${cwd}`);
        return;
    }

    const name = args[0];

    if (name === undefined) {
        uninstallAll(project.modulesDir);
        return;
    }

    try {
        uninstallDependency(project.config, project.modulesDir, name);
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    }
}

async function runPack(args: string[]): Promise<void> {
    const { rest: rest1, present: compress } = extractFlag(args, "--compress");
    const { rest: rest2, value: outputArg } = extractValueFlag(rest1, "--output");
    const cwd = process.cwd();
    const targetDir = rest2[0] !== undefined ? Path.resolve(cwd, rest2[0]) : cwd;
    const outputDir = outputArg !== undefined ? Path.resolve(cwd, outputArg) : undefined;
    const project = findProject(targetDir);

    if (project === null) {
        reportError(`No ${PACKAGE_FILE_NAME} found in ${targetDir}`);
        return;
    }

    try {
        await packProject(project.projectDir, project.config, undefined, { compress, outputDir });
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    }
}

async function runPublish(args: string[]): Promise<void> {
    const { rest: rest1, present: compress } = extractFlag(args, "--compress");
    const { rest: rest2, value: registry } = extractValueFlag(rest1, "--registry");
    const cwd = process.cwd();
    const targetDir = rest2[0] !== undefined ? Path.resolve(cwd, rest2[0]) : cwd;
    const project = findProject(targetDir);

    if (project === null) {
        reportError(`No ${PACKAGE_FILE_NAME} found in ${targetDir}`);
        return;
    }

    const { name, version, description, license, category, homepage, repository, author } = project.config;

    if (name === undefined || version === undefined) {
        reportError(`${PACKAGE_FILE_NAME} must declare "name" and "version" to publish.`);
        return;
    }

    const stagingDir = FileSystem.mkdtempSync(Path.join(OS.tmpdir(), "exon-publish-"));

    try {
        const archivePath = await packProject(project.projectDir, project.config, undefined, { compress, outputDir: stagingDir });
        const publisher = new PackagePublisher({ registry });
        await publisher.publish(archivePath, name, version, { description, license, category, homepage, repository, author });
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    } finally {
        FileSystem.rmSync(stagingDir, { recursive: true, force: true });
    }
}

async function runFetch(args: string[]): Promise<void> {
    const cwd = process.cwd();
    const urlArg = args[0];

    if (urlArg === undefined) {
        reportError("Usage: expm fetch <url> [folder-path]");
        return;
    }

    const outputDir = args[1] !== undefined ? Path.resolve(cwd, args[1]) : undefined;

    try {
        await fetchAndUnpack(urlArg, outputDir);
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    }
}

async function runUnpack(args: string[]): Promise<void> {
    const cwd = process.cwd();
    const archiveArg = args[0];

    if (archiveArg === undefined) {
        reportError("Usage: expm unpack <file.expkg> [folder-path]");
        return;
    }

    const archivePath = Path.resolve(cwd, archiveArg);
    const outputDir = args[1] !== undefined ? Path.resolve(cwd, args[1]) : undefined;

    try {
        await unpackArchive(archivePath, outputDir);
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    }
}

export async function execute(): Promise<void> {
    const [command, ...args] = process.argv.slice(2);

    if (command === undefined) {
        reportError(USAGE);
        return;
    }

    if (command === "install") {
        await runInstall(args);
        return;
    }

    if (command === "uninstall") {
        runUninstall(args);
        return;
    }

    if (command === "pack") {
        await runPack(args);
        return;
    }

    if (command === "publish") {
        await runPublish(args);
        return;
    }

    if (command === "unpack") {
        await runUnpack(args);
        return;
    }

    if (command === "fetch") {
        await runFetch(args);
        return;
    }

    reportError(`Unknown command "${command}"\n${USAGE}`);
}

if (process.argv[1] === __filename) {
    execute();
}
