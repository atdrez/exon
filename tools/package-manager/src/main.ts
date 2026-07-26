// SPDX-License-Identifier: MIT

import * as Path from "path";
import { spawnSync } from "child_process";
import { findProject, PACKAGE_FILE_NAME } from "exon-runtime";

import { installDependencies, installNodeDependencies, uninstallAll, uninstallDependency } from "./PackageInstaller";

const USAGE = "Usage: expm install [dir]\n       expm uninstall [name]";

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

    reportError(`Unknown command "${command}"\n${USAGE}`);
}

if (process.argv[1] === __filename) {
    execute();
}
