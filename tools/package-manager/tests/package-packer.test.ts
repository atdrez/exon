// SPDX-License-Identifier: MIT

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import { describe, it, expect, afterEach } from 'vitest';
import { packProject } from '../src/PackagePacker';
import type { PackageConfig } from 'exon-runtime';

let tmpDirs: string[] = [];

function mkTmpDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
}

function makeConfig(overrides: Partial<PackageConfig> = {}): PackageConfig {
    return {
        entry: 'main.exon',
        scripts: {},
        dependencies: {},
        nodeDependencies: {},
        ...overrides,
    };
}

async function extract(archivePath: string): Promise<string> {
    const extractedDir = mkTmpDir('exon-pack-extracted-');
    await tar.x({ file: archivePath, cwd: extractedDir });
    return extractedDir;
}

afterEach(() => {
    for (const dir of tmpDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs = [];
});

describe('packProject', () => {
    it('names the archive after name and version', async () => {
        const projectDir = mkTmpDir('exon-pack-proj-');
        fs.writeFileSync(path.join(projectDir, 'main.exon'), '{}');

        const archivePath = await packProject(projectDir, makeConfig({ name: 'mylib', version: '1.2.3' }));

        expect(archivePath).toBe(path.join(projectDir, 'mylib-1.2.3.expkg'));
        expect(fs.existsSync(archivePath)).toBe(true);
    });

    it('omits the version segment when version is not set', async () => {
        const projectDir = mkTmpDir('exon-pack-proj-');
        fs.writeFileSync(path.join(projectDir, 'main.exon'), '{}');

        const archivePath = await packProject(projectDir, makeConfig({ name: 'mylib' }));

        expect(archivePath).toBe(path.join(projectDir, 'mylib.expkg'));
    });

    it('falls back to "package" when name is not set', async () => {
        const projectDir = mkTmpDir('exon-pack-proj-');
        fs.writeFileSync(path.join(projectDir, 'main.exon'), '{}');

        const archivePath = await packProject(projectDir, makeConfig());

        expect(archivePath).toBe(path.join(projectDir, 'package.expkg'));
    });

    it('packages project files with no wrapping folder', async () => {
        const projectDir = mkTmpDir('exon-pack-proj-');
        fs.writeFileSync(path.join(projectDir, 'exon-package.json'), '{}');
        fs.writeFileSync(path.join(projectDir, 'main.exon'), '{ ok: true }');
        fs.mkdirSync(path.join(projectDir, 'lib'));
        fs.writeFileSync(path.join(projectDir, 'lib', 'helper.exon'), '{}');

        const archivePath = await packProject(projectDir, makeConfig({ name: 'mylib' }));
        const extractedDir = await extract(archivePath);

        expect(fs.readFileSync(path.join(extractedDir, 'main.exon'), 'utf8')).toBe('{ ok: true }');
        expect(fs.existsSync(path.join(extractedDir, 'lib', 'helper.exon'))).toBe(true);
        expect(fs.existsSync(path.join(extractedDir, 'exon-package.json'))).toBe(true);
    });

    it('excludes exon_modules, node_modules, .git, and existing expkg archives', async () => {
        const projectDir = mkTmpDir('exon-pack-proj-');
        fs.writeFileSync(path.join(projectDir, 'main.exon'), '{}');
        fs.mkdirSync(path.join(projectDir, 'exon_modules', 'dep'), { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'exon_modules', 'dep', 'file.exon'), '{}');
        fs.mkdirSync(path.join(projectDir, 'node_modules', 'pkg'), { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'node_modules', 'pkg', 'index.js'), '{}');
        fs.mkdirSync(path.join(projectDir, '.git'));
        fs.writeFileSync(path.join(projectDir, '.git', 'HEAD'), 'ref: refs/heads/main');
        fs.writeFileSync(path.join(projectDir, 'stale.expkg'), 'not a real archive');

        const archivePath = await packProject(projectDir, makeConfig({ name: 'mylib' }));
        const extractedDir = await extract(archivePath);

        expect(fs.existsSync(path.join(extractedDir, 'main.exon'))).toBe(true);
        expect(fs.existsSync(path.join(extractedDir, 'exon_modules'))).toBe(false);
        expect(fs.existsSync(path.join(extractedDir, 'node_modules'))).toBe(false);
        expect(fs.existsSync(path.join(extractedDir, '.git'))).toBe(false);
        expect(fs.existsSync(path.join(extractedDir, 'stale.expkg'))).toBe(false);
    });

    it('leaves file contents untouched without --compress', async () => {
        const projectDir = mkTmpDir('exon-pack-proj-');
        fs.writeFileSync(path.join(projectDir, 'main.exon'), 'flow.node {\n    // keep me\n    name: "foo"\n}');
        fs.writeFileSync(path.join(projectDir, 'lib.js'), '// keep me\nfunction add(a, b) { return a + b; }\n');

        const archivePath = await packProject(projectDir, makeConfig({ name: 'mylib' }));
        const extractedDir = await extract(archivePath);

        expect(fs.readFileSync(path.join(extractedDir, 'main.exon'), 'utf8')).toContain('// keep me');
        expect(fs.readFileSync(path.join(extractedDir, 'lib.js'), 'utf8')).toContain('// keep me');
    });

    it('strips comments/whitespace from .exon and minifies .js files with --compress', async () => {
        const projectDir = mkTmpDir('exon-pack-proj-');
        fs.writeFileSync(
            path.join(projectDir, 'main.exon'),
            'flow.node {\n    // a comment\n    name: "foo bar"\n}'
        );
        fs.writeFileSync(
            path.join(projectDir, 'lib.js'),
            '// a comment\nfunction add(a, b) {\n    return a + b;\n}\nmodule.exports = { add };\n'
        );
        fs.writeFileSync(path.join(projectDir, 'data.txt'), 'unchanged // not exon or js\n');

        const archivePath = await packProject(projectDir, makeConfig({ name: 'mylib' }), undefined, { compress: true });
        const extractedDir = await extract(archivePath);

        const exon = fs.readFileSync(path.join(extractedDir, 'main.exon'), 'utf8');
        expect(exon).toBe('flow.node{name:"foo bar"}');

        const js = fs.readFileSync(path.join(extractedDir, 'lib.js'), 'utf8');
        expect(js).not.toContain('// a comment');
        expect(js).not.toContain('\n');

        const moduleShim = { exports: {} as { add: (a: number, b: number) => number } };
        new Function('module', js)(moduleShim);
        expect(moduleShim.exports.add(2, 3)).toBe(5);

        expect(fs.readFileSync(path.join(extractedDir, 'data.txt'), 'utf8')).toBe('unchanged // not exon or js\n');
    });

    it('still excludes exon_modules, node_modules, and .git with --compress', async () => {
        const projectDir = mkTmpDir('exon-pack-proj-');
        fs.writeFileSync(path.join(projectDir, 'main.exon'), '{}');
        fs.mkdirSync(path.join(projectDir, 'exon_modules', 'dep'), { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'exon_modules', 'dep', 'file.exon'), '{}');

        const archivePath = await packProject(projectDir, makeConfig({ name: 'mylib' }), undefined, { compress: true });
        const extractedDir = await extract(archivePath);

        expect(fs.existsSync(path.join(extractedDir, 'exon_modules'))).toBe(false);
    });
});
