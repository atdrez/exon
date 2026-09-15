// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";
import * as OS from "os";
import * as Crypto from "crypto";
import * as tar from "tar";
import { spawnSync } from "child_process";
import { loadPackageConfig, PACKAGE_FILE_NAME } from "exon-runtime";
import type { PackageConfig } from "exon-runtime";

export interface InstallLogger {
    info(message: string): void;
}

interface PackageMetadata {
    hash: string;
    downloadUrl: string;
}

const consoleLogger: InstallLogger = {
    info: (message) => console.log(message),
};

const DEFAULT_REGISTRY = "https://api.exonlang.org";

function metadataUrlFor(registry: string, name: string, version: string): string {
    return `${registry.replace(/\/+$/, "")}/api/v1/packages/${name}/${version}`;
}

function resolveAuthToken(explicitToken?: string): string | undefined {
    const token = explicitToken ?? process.env.EXON_REGISTRY_TOKEN;
    return token !== undefined && token.length > 0 ? token : undefined;
}

// The registry serves public package metadata and downloads without a token (see the
// backend's optionalAuthentication middleware), so a token is attached only when one is
// available. Installing a private package with no token still fails, but with the
// registry's own 401/403 response rather than a client-side check that would also block
// installing public packages, such as the standard library, for a logged-out user.
async function fetchFromRegistry(url: string, token?: string): Promise<Response> {
    const resolvedToken = resolveAuthToken(token);
    const headers = resolvedToken !== undefined ? { Authorization: `Bearer ${resolvedToken}` } : undefined;
    const response = await fetch(url, headers !== undefined ? { headers } : undefined);

    if (!response.ok) {
        throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
    }

    return response;
}

function targetDirFor(modulesDir: string, name: string): string {
    return Path.join(modulesDir, name);
}

export async function installDependencies(
    packagePath: string,
    config: PackageConfig,
    modulesDir: string,
    logger: InstallLogger = consoleLogger,
    token?: string
): Promise<void> {
    const projectDir = Path.dirname(packagePath);
    const visited = new Set<string>();
    await installDependenciesInto(config, modulesDir, projectDir, logger, visited, true, token);
}

async function installDependenciesInto(
    config: PackageConfig,
    modulesDir: string,
    projectDir: string,
    logger: InstallLogger,
    visited: Set<string>,
    isRoot: boolean,
    token?: string
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

        await installFromHttp(dependency.registry ?? process.env.EXON_REGISTRY_API ?? DEFAULT_REGISTRY, name, dependency.version, targetDir, token);

        await collectTransitive(targetDir, modulesDir, projectDir, logger, visited, token);
    }
}

async function collectTransitive(
    installedDir: string,
    modulesDir: string,
    projectDir: string,
    logger: InstallLogger,
    visited: Set<string>,
    token?: string
): Promise<void> {
    const nestedPackagePath = Path.join(installedDir, PACKAGE_FILE_NAME);

    if (!FileSystem.existsSync(nestedPackagePath)) {
        return;
    }

    const nestedConfig = loadPackageConfig(nestedPackagePath);

    if (Object.keys(nestedConfig.nodeDependencies).length > 0) {
        installNodeDependencies(installedDir, nestedConfig.nodeDependencies, logger);
    }

    await installDependenciesInto(nestedConfig, modulesDir, projectDir, logger, visited, false, token);
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

export function addDependencyToConfig(packagePath: string, name: string, version: string): void {
    let raw: Record<string, unknown>;

    try {
        raw = JSON.parse(FileSystem.readFileSync(packagePath, "utf8")) as Record<string, unknown>;
    } catch (e) {
        throw new Error(`Failed to read ${packagePath}: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (typeof raw.dependencies !== "object" || raw.dependencies === null) {
        raw.dependencies = {};
    }

    (raw.dependencies as Record<string, unknown>)[name] = { version };

    FileSystem.writeFileSync(packagePath, JSON.stringify(raw, null, 4) + "\n");
}

export async function installPackage(
    name: string,
    version: string,
    modulesDir: string,
    logger: InstallLogger = consoleLogger,
    registry?: string,
    token?: string
): Promise<void> {
    FileSystem.mkdirSync(modulesDir, { recursive: true });

    const targetDir = targetDirFor(modulesDir, name);
    const visited = new Set<string>([targetDir]);

    logger.info(`Installing "${name}@${version}" -> exon_modules/${name} ...`);
    await installFromHttp(registry ?? process.env.EXON_REGISTRY_API ?? DEFAULT_REGISTRY, name, version, targetDir, token);
    await collectTransitive(targetDir, modulesDir, modulesDir, logger, visited, token);
}

// Fetches the package's metadata (which carries the same hash the registry wrote to
// "{name}@{version}/meta.json" on publish, see backend/docs/api.md) before downloading the
// archive, so the downloaded bytes can be checksummed against it - catching a corrupted or
// truncated download before it gets extracted into exon_modules.
async function installFromHttp(registry: string, name: string, version: string, targetDir: string, token?: string): Promise<void> {
    const metadataUrl = metadataUrlFor(registry, name, version);
    const metadataResponse = await fetchFromRegistry(metadataUrl, token);
    const metadata = (await metadataResponse.json()) as PackageMetadata;

    const downloadUrl = new URL(metadata.downloadUrl, metadataUrl).toString();
    const downloadResponse = await fetchFromRegistry(downloadUrl, token);
    const buffer = Buffer.from(await downloadResponse.arrayBuffer());

    const hash = Crypto.createHash("sha256").update(buffer).digest("hex");
    if (hash !== metadata.hash) {
        throw new Error(`Checksum mismatch for "${name}@${version}": expected ${metadata.hash}, got ${hash}.`);
    }

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
