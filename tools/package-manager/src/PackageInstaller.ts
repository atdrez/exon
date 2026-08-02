// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";
import * as OS from "os";
import * as tar from "tar";
import { spawnSync } from "child_process";
import { loadPackageConfig, PACKAGE_FILE_NAME } from "exon-runtime";
import type { PackageConfig, PackageDependency } from "exon-runtime";

export interface InstallLogger {
    info(message: string): void;
}

const consoleLogger: InstallLogger = {
    info: (message) => console.log(message),
};

const DEFAULT_REGISTRY = "https://packages.exonlang.org";

function urlFor(name: string, dependency: PackageDependency): string {
    const registry = dependency.registry ?? DEFAULT_REGISTRY;
    return `${registry}/${name}/${dependency.version}.expkg`;
}

function targetDirFor(modulesDir: string, name: string): string {
    return Path.join(modulesDir, name);
}

export async function installDependencies(
    packagePath: string,
    config: PackageConfig,
    modulesDir: string,
    logger: InstallLogger = consoleLogger
): Promise<Record<string, string>> {
    const projectDir = Path.dirname(packagePath);
    const visited = new Set<string>();
    const nodeDependencies: Record<string, string> = {};
    await installDependenciesInto(config, modulesDir, projectDir, logger, visited, true, nodeDependencies);
    return nodeDependencies;
}

async function installDependenciesInto(
    config: PackageConfig,
    modulesDir: string,
    projectDir: string,
    logger: InstallLogger,
    visited: Set<string>,
    isRoot: boolean,
    nodeDependencies: Record<string, string>
): Promise<void> {
    const names = Object.keys(config.dependencies);

    if (names.length === 0) {
        if (isRoot) {
            logger.info("No dependencies to install.");
        }
        return;
    }

    FileSystem.mkdirSync(modulesDir, { recursive: true });

    for (const name of names) {
        const dependency = config.dependencies[name];
        const targetDir = targetDirFor(modulesDir, name);

        if (visited.has(targetDir)) {
            continue;
        }
        visited.add(targetDir);

        logger.info(`Installing "${name}" -> exon_modules/${name} ...`);

        await installFromHttp(urlFor(name, dependency), targetDir);

        await collectTransitive(targetDir, modulesDir, projectDir, logger, visited, nodeDependencies);
    }
}

async function collectTransitive(
    installedDir: string,
    modulesDir: string,
    projectDir: string,
    logger: InstallLogger,
    visited: Set<string>,
    nodeDependencies: Record<string, string>
): Promise<void> {
    const nestedPackagePath = Path.join(installedDir, PACKAGE_FILE_NAME);

    if (!FileSystem.existsSync(nestedPackagePath)) {
        return;
    }

    const nestedConfig = loadPackageConfig(nestedPackagePath);

    Object.assign(nodeDependencies, nestedConfig.nodeDependencies);
    await installDependenciesInto(nestedConfig, modulesDir, projectDir, logger, visited, false, nodeDependencies);
}

export function uninstallAll(modulesDir: string, logger: InstallLogger = consoleLogger): void {
    if (!FileSystem.existsSync(modulesDir)) {
        logger.info("Nothing to uninstall.");
        return;
    }

    FileSystem.rmSync(modulesDir, { recursive: true, force: true });
    logger.info("Removed exon_modules.");
}

export function uninstallDependency(
    config: PackageConfig,
    modulesDir: string,
    name: string,
    logger: InstallLogger = consoleLogger
): void {
    const dependency = config.dependencies[name];

    if (dependency === undefined) {
        throw new Error(`Dependency "${name}" is not declared in exon-package.json`);
    }

    const targetDir = targetDirFor(modulesDir, name);

    if (!FileSystem.existsSync(targetDir)) {
        logger.info(`"${name}" is not installed.`);
        return;
    }

    FileSystem.rmSync(targetDir, { recursive: true, force: true });
    logger.info(`Removed "${name}" (exon_modules/${name}).`);
}

export function installNodeDependencies(
    projectDir: string,
    nodeDependencies: Record<string, string>,
    logger: InstallLogger = consoleLogger
): void {
    const names = Object.keys(nodeDependencies);

    if (names.length === 0) {
        logger.info("No node dependencies to install.");
        return;
    }

    const specs = names.map((name) => `${name}@${nodeDependencies[name]}`);
    logger.info(`Installing npm packages: ${specs.join(", ")} ...`);

    const command = `npm install --no-save --prefix "${projectDir}" ${specs.map((s) => `"${s}"`).join(" ")}`;
    const result = spawnSync(command, { stdio: "inherit", shell: true });

    if (result.error) {
        throw new Error(result.error.message);
    }

    if ((result.status ?? 0) !== 0) {
        throw new Error(`npm install failed with exit code ${result.status}`);
    }
}

async function installFromHttp(url: string, targetDir: string): Promise<void> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to download "${url}": ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const tmpDir = FileSystem.mkdtempSync(Path.join(OS.tmpdir(), "exon-install-"));
    const tmpFile = Path.join(tmpDir, "package.expkg");

    try {
        FileSystem.writeFileSync(tmpFile, buffer);
        FileSystem.rmSync(targetDir, { recursive: true, force: true });
        FileSystem.mkdirSync(targetDir, { recursive: true });
        await tar.x({ file: tmpFile, cwd: targetDir });
    } finally {
        FileSystem.rmSync(tmpDir, { recursive: true, force: true });
    }
}
