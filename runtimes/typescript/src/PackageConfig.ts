// SPDX-License-Identifier: MIT

import * as FileSystem from "fs";

export const DEFAULT_ENTRY_FILE = "main.exon";

export interface PackageDependency {
    version: string;
    registry?: string;
}

export interface PackageAuthor {
    name: string;
    email?: string;
}

export interface PackageRepository {
    type: string;
    url: string;
}

// A user-runnable script declared by a package
export interface PackageEntry {
    name: string;
    description: string;
    path: string;
}

export interface PackageConfig {
    // Package identifier used for publishing / dependency references (e.g. "+es/basic-examples").
    name?: string;
    // Human-friendly display name
    title?: string;
    version?: string;
    description?: string;
    license?: string;
    author?: PackageAuthor;
    // Freeform taxonomy string (e.g. "lib/flow", "examples") - the editor's Templates page
    // filters published packages to category "examples" to build its catalog.
    category?: string;
    homepage?: string;
    repository?: PackageRepository;
    private?: boolean;
    // Project-relative path to a project icon file (e.g. "icon.png"), shown in the editor's
    // project cards. Resolution to an absolute filesystem path is the consumer's job.
    icon?: string;
    entry: string;
    scripts: Record<string, string>;
    dependencies: Record<string, PackageDependency>;
    nodeDependencies: Record<string, string>;
    entries: PackageEntry[];
}

function expectString(value: any, label: string, packagePath: string): string {
    if (typeof value !== "string") {
        throw new Error(`${packagePath}: "${label}" must be a string`);
    }
    return value;
}

function expectObject(value: any, label: string, packagePath: string): Record<string, any> {
    if (!(value instanceof Object) || Array.isArray(value)) {
        throw new Error(`${packagePath}: "${label}" must be an object`);
    }
    return value;
}

function parseScripts(raw: any, packagePath: string): Record<string, string> {
    if (raw === undefined) {
        return {};
    }

    const source = expectObject(raw, "scripts", packagePath);
    const scripts: Record<string, string> = {};

    for (const key of Object.keys(source)) {
        scripts[key] = expectString(source[key], `scripts.${key}`, packagePath);
    }

    return scripts;
}

function parseDependencies(raw: any, packagePath: string): Record<string, PackageDependency> {
    if (raw === undefined) {
        return {};
    }

    const source = expectObject(raw, "dependencies", packagePath);
    const dependencies: Record<string, PackageDependency> = {};

    for (const key of Object.keys(source)) {
        const entry = expectObject(source[key], `dependencies.${key}`, packagePath);
        const version = expectString(entry.version, `dependencies.${key}.version`, packagePath);

        if (version.length === 0) {
            throw new Error(`${packagePath}: "dependencies.${key}.version" must not be empty`);
        }

        const dependency: PackageDependency = { version };

        if (entry.registry !== undefined) {
            const registry = expectString(entry.registry, `dependencies.${key}.registry`, packagePath);
            if (registry.length > 0) {
                dependency.registry = registry;
            }
        }

        dependencies[key] = dependency;
    }

    return dependencies;
}

function parseAuthor(raw: any, packagePath: string): PackageAuthor {
    const source = expectObject(raw, "author", packagePath);
    const author: PackageAuthor = { name: expectString(source.name, "author.name", packagePath) };

    if (source.email !== undefined) {
        author.email = expectString(source.email, "author.email", packagePath);
    }

    return author;
}

function parseRepository(raw: any, packagePath: string): PackageRepository {
    const source = expectObject(raw, "repository", packagePath);
    return {
        type: expectString(source.type, "repository.type", packagePath),
        url: expectString(source.url, "repository.url", packagePath),
    };
}

function parseEntries(raw: any, packagePath: string): PackageEntry[] {
    if (raw === undefined) {
        return [];
    }

    if (!Array.isArray(raw)) {
        throw new Error(`${packagePath}: "entries" must be an array`);
    }

    return raw.map((value, index) => {
        const source = expectObject(value, `entries[${index}]`, packagePath);
        return {
            name: expectString(source.name, `entries[${index}].name`, packagePath),
            description: expectString(source.description, `entries[${index}].description`, packagePath),
            path: expectString(source.path, `entries[${index}].path`, packagePath),
        };
    });
}

function parseNodeDependencies(raw: any, packagePath: string): Record<string, string> {
    if (raw === undefined) {
        return {};
    }

    const source = expectObject(raw, "nodeDependencies", packagePath);
    const nodeDependencies: Record<string, string> = {};

    for (const key of Object.keys(source)) {
        nodeDependencies[key] = expectString(source[key], `nodeDependencies.${key}`, packagePath);
    }

    return nodeDependencies;
}

export function loadPackageConfig(packagePath: string): PackageConfig {
    let raw: any;

    try {
        raw = JSON.parse(FileSystem.readFileSync(packagePath, "utf8"));
    } catch (e) {
        throw new Error(`${packagePath}: failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
    }

    expectObject(raw, "<root>", packagePath);

    const config: PackageConfig = {
        entry: raw.entry !== undefined ? expectString(raw.entry, "entry", packagePath) : DEFAULT_ENTRY_FILE,
        scripts: parseScripts(raw.scripts, packagePath),
        dependencies: parseDependencies(raw.dependencies, packagePath),
        nodeDependencies: parseNodeDependencies(raw.nodeDependencies, packagePath),
        entries: parseEntries(raw.entries, packagePath),
    };

    if (raw.name !== undefined)
        config.name = expectString(raw.name, "name", packagePath);

    if (raw.title !== undefined)
        config.title = expectString(raw.title, "title", packagePath);

    if (raw.icon !== undefined)
        config.icon = expectString(raw.icon, "icon", packagePath);

    if (raw.version !== undefined)
        config.version = expectString(raw.version, "version", packagePath);

    if (raw.description !== undefined)
        config.description = expectString(raw.description, "description", packagePath);

    if (raw.license !== undefined)
        config.license = expectString(raw.license, "license", packagePath);

    if (raw.author !== undefined)
        config.author = parseAuthor(raw.author, packagePath);

    if (raw.category !== undefined)
        config.category = expectString(raw.category, "category", packagePath);

    if (raw.homepage !== undefined)
        config.homepage = expectString(raw.homepage, "homepage", packagePath);

    if (raw.repository !== undefined)
        config.repository = parseRepository(raw.repository, packagePath);

    if (raw.private !== undefined)
        config.private = Boolean(raw.private);

    if (config.entry.length === 0) {
        config.entry = DEFAULT_ENTRY_FILE;
    }

    return config;
}
