// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";

import { loadPackageConfig, PackageConfig } from "./PackageConfig";

export const PACKAGE_FILE_NAME = "exon-package.json";
export const MODULES_DIR_NAME = "exon_modules";

export interface ExonProject {
    projectDir: string;
    packagePath: string;
    modulesDir: string;
    config: PackageConfig;
}

function packagePathFor(dir: string): string {
    return Path.join(dir, PACKAGE_FILE_NAME);
}

export function findProject(dir: string): ExonProject | null {
    const packagePath = packagePathFor(dir);

    if (!FileSystem.existsSync(packagePath)) {
        return null;
    }

    return {
        projectDir: dir,
        packagePath,
        modulesDir: Path.join(dir, MODULES_DIR_NAME),
        config: loadPackageConfig(packagePath),
    };
}

export function isDirectoryTarget(fileName: string, cwd: string): boolean {
    const resolved = Path.resolve(cwd, fileName);
    return FileSystem.existsSync(resolved) && FileSystem.statSync(resolved).isDirectory();
}

export function resolveProjectForTarget(fileName: string | undefined, cwd: string): ExonProject | null {
    if (fileName !== undefined && isDirectoryTarget(fileName, cwd)) {
        return findProject(Path.resolve(cwd, fileName));
    }

    return findProject(cwd);
}

export function resolveEntryFile(project: ExonProject): string {
    return Path.join(project.projectDir, project.config.entry);
}
