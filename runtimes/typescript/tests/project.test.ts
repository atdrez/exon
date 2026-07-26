// SPDX-License-Identifier: MIT

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { findProject, resolveProjectForTarget, resolveEntryFile, isDirectoryTarget } from '../src/Project';

let tmpDirs: string[] = [];

function makeProjectDir(packageContent: string | null): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exon-project-'));
    tmpDirs.push(dir);

    if (packageContent !== null) {
        fs.writeFileSync(path.join(dir, 'exon-package.json'), packageContent);
    }

    return dir;
}

afterEach(() => {
    for (const dir of tmpDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs = [];
});

describe('findProject', () => {
    it('returns null when there is no exon-package.json', () => {
        const dir = makeProjectDir(null);
        expect(findProject(dir)).toBeNull();
    });

    it('finds and parses the package when present', () => {
        const dir = makeProjectDir(`{ "name": "sample", "entry": "start.exon" }`);
        const project = findProject(dir);

        expect(project).not.toBeNull();
        expect(project!.projectDir).toBe(dir);
        expect(project!.config.name).toBe('sample');
        expect(project!.packagePath).toBe(path.join(dir, 'exon-package.json'));
        expect(project!.modulesDir).toBe(path.join(dir, 'exon_modules'));
    });
});

describe('isDirectoryTarget', () => {
    it('is true for an existing directory', () => {
        const dir = makeProjectDir(null);
        expect(isDirectoryTarget('.', dir)).toBe(true);
    });

    it('is false for a file target', () => {
        const dir = makeProjectDir(null);
        const filePath = path.join(dir, 'main.exon');
        fs.writeFileSync(filePath, '{}');
        expect(isDirectoryTarget('main.exon', dir)).toBe(false);
    });

    it('is false for a target that does not exist', () => {
        const dir = makeProjectDir(null);
        expect(isDirectoryTarget('missing.exon', dir)).toBe(false);
    });
});

describe('resolveProjectForTarget', () => {
    it('resolves the project rooted at a directory target', () => {
        const dir = makeProjectDir(`{ "name": "sample" }`);
        const project = resolveProjectForTarget('.', dir);
        expect(project?.config.name).toBe('sample');
    });

    it('falls back to cwd when the target is a specific file', () => {
        const dir = makeProjectDir(`{ "name": "sample" }`);
        fs.writeFileSync(path.join(dir, 'main.exon'), '{}');
        const project = resolveProjectForTarget('main.exon', dir);
        expect(project?.config.name).toBe('sample');
    });

    it('returns null when neither the target dir nor cwd has a project', () => {
        const dir = makeProjectDir(null);
        expect(resolveProjectForTarget('.', dir)).toBeNull();
    });
});

describe('resolveEntryFile', () => {
    it('joins the project dir with the configured entry', () => {
        const dir = makeProjectDir(`{ "entry": "start.exon" }`);
        const project = findProject(dir)!;
        expect(resolveEntryFile(project)).toBe(path.join(dir, 'start.exon'));
    });

    it('defaults to main.exon', () => {
        const dir = makeProjectDir(`{ "name": "sample" }`);
        const project = findProject(dir)!;
        expect(resolveEntryFile(project)).toBe(path.join(dir, 'main.exon'));
    });
});
