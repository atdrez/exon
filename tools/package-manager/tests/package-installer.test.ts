// SPDX-License-Identifier: MIT

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as tar from 'tar';
import { describe, it, expect, afterEach } from 'vitest';
import { installDependencies, installNodeDependencies, uninstallAll, uninstallDependency } from '../src/PackageInstaller';
import type { PackageConfig } from 'exon';

let tmpDirs: string[] = [];

function mkTmpDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
}

function makeConfig(dependencies: PackageConfig['dependencies']): PackageConfig {
    return {
        entry: 'main.exon',
        scripts: {},
        dependencies,
        nodeDependencies: {},
    };
}

function makeProject(): { projectDir: string; packagePath: string } {
    const projectDir = mkTmpDir('exon-install-proj-');
    const packagePath = path.join(projectDir, 'exon-package.json');
    fs.writeFileSync(packagePath, '{}');
    return { projectDir, packagePath };
}

afterEach(() => {
    for (const dir of tmpDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs = [];
});

describe('installDependencies: local paths', () => {
    it('copies a relative local dependency into exon_modules/<name>', async () => {
        const { projectDir, packagePath } = makeProject();

        const externalDir = mkTmpDir('exon-install-src-');
        fs.writeFileSync(path.join(externalDir, 'lib.exon'), '{ ok: true }');

        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({ mylib: { source: path.relative(projectDir, externalDir) } });

        await installDependencies(packagePath, config, modulesDir);

        const copied = path.join(modulesDir, 'mylib', 'lib.exon');
        expect(fs.existsSync(copied)).toBe(true);
        expect(fs.readFileSync(copied, 'utf8')).toBe('{ ok: true }');
    });

    it('uses "retarget" as the destination folder name', async () => {
        const { projectDir, packagePath } = makeProject();

        const externalDir = mkTmpDir('exon-install-src-');
        fs.writeFileSync(path.join(externalDir, 'a.exon'), '{}');

        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({
            http: { retarget: 'otherHttp', source: path.relative(projectDir, externalDir) },
        });

        await installDependencies(packagePath, config, modulesDir);

        expect(fs.existsSync(path.join(modulesDir, 'otherHttp', 'a.exon'))).toBe(true);
        expect(fs.existsSync(path.join(modulesDir, 'http'))).toBe(false);
    });

    it('resolves an absolute local source directly', async () => {
        const { projectDir, packagePath } = makeProject();

        const externalDir = mkTmpDir('exon-install-src-');
        fs.writeFileSync(path.join(externalDir, 'b.exon'), '{}');

        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({ abs: { source: externalDir } });

        await installDependencies(packagePath, config, modulesDir);

        expect(fs.existsSync(path.join(modulesDir, 'abs', 'b.exon'))).toBe(true);
    });

    it('throws when the local source does not exist', async () => {
        const { projectDir, packagePath } = makeProject();
        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({ missing: { source: '../does-not-exist' } });

        await expect(installDependencies(packagePath, config, modulesDir)).rejects.toThrow(/does not exist/);
    });

    it('does nothing when there are no dependencies', async () => {
        const { projectDir, packagePath } = makeProject();
        const modulesDir = path.join(projectDir, 'exon_modules');

        await installDependencies(packagePath, makeConfig({}), modulesDir);

        expect(fs.existsSync(modulesDir)).toBe(false);
    });
});

describe('installDependencies: transitive nodeDependencies', () => {
    function makeLocalPackage(dependencies: PackageConfig['dependencies'], nodeDependencies: Record<string, string>): string {
        const dir = mkTmpDir('exon-install-src-');
        fs.writeFileSync(
            path.join(dir, 'exon-package.json'),
            JSON.stringify({ entry: 'main.exon', scripts: {}, dependencies, nodeDependencies })
        );
        return dir;
    }

    it("returns a dependency's nodeDependencies without installing them on the spot", async () => {
        const { projectDir, packagePath } = makeProject();
        const libDir = makeLocalPackage({}, { 'some-pkg': '^1.0.0' });

        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({ mylib: { source: path.relative(projectDir, libDir) } });

        const nodeDependencies = await installDependencies(packagePath, config, modulesDir);

        expect(nodeDependencies).toEqual({ 'some-pkg': '^1.0.0' });
        expect(fs.existsSync(path.join(projectDir, 'node_modules'))).toBe(false);
    });

    it('merges nodeDependencies from every package in the graph into one map - the fix for ' +
       '`npm install --no-save` pruning packages added by an earlier, separate npm install call', async () => {
        const { projectDir, packagePath } = makeProject();

        // A depends on B; both declare their own, distinct nodeDependencies. Before the fix,
        // each was installed via its own separate `npm install` call, and the later call
        // (for B) silently pruned whatever the earlier call (for A) had just installed.
        const bDir = makeLocalPackage({}, { 'pkg-b': '^2.0.0' });
        const aDir = makeLocalPackage({ b: { source: bDir } }, { 'pkg-a': '^1.0.0' });

        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({ a: { source: path.relative(projectDir, aDir) } });

        const nodeDependencies = await installDependencies(packagePath, config, modulesDir);

        expect(nodeDependencies).toEqual({ 'pkg-a': '^1.0.0', 'pkg-b': '^2.0.0' });
    });
});

describe('installDependencies: http sources', () => {
    it('downloads and extracts a .tar.gz archive', async () => {
        const { projectDir, packagePath } = makeProject();

        const archiveContentDir = mkTmpDir('exon-install-archive-');
        fs.writeFileSync(path.join(archiveContentDir, 'index.exon'), '{ served: true }');

        const archivePath = path.join(mkTmpDir('exon-install-tar-'), 'pkg.tar.gz');
        await tar.c({ gzip: true, file: archivePath, cwd: archiveContentDir }, ['index.exon']);
        const archiveBuffer = fs.readFileSync(archivePath);

        const server = http.createServer((_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/gzip' });
            res.end(archiveBuffer);
        });

        await new Promise<void>((resolve) => server.listen(0, resolve));
        const address = server.address();
        if (address === null || typeof address === 'string') throw new Error('unexpected server address');
        const url = `http://127.0.0.1:${address.port}/ui.tar.gz`;

        try {
            const modulesDir = path.join(projectDir, 'exon_modules');
            const config = makeConfig({ ui: { source: url } });

            await installDependencies(packagePath, config, modulesDir);

            const extracted = path.join(modulesDir, 'ui', 'index.exon');
            expect(fs.existsSync(extracted)).toBe(true);
            expect(fs.readFileSync(extracted, 'utf8')).toBe('{ served: true }');
        } finally {
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });

    it('throws a clear error on a non-2xx response', async () => {
        const { projectDir, packagePath } = makeProject();

        const server = http.createServer((_req, res) => {
            res.writeHead(404);
            res.end('not found');
        });

        await new Promise<void>((resolve) => server.listen(0, resolve));
        const address = server.address();
        if (address === null || typeof address === 'string') throw new Error('unexpected server address');
        const url = `http://127.0.0.1:${address.port}/missing.tar.gz`;

        try {
            const modulesDir = path.join(projectDir, 'exon_modules');
            const config = makeConfig({ ui: { source: url } });

            await expect(installDependencies(packagePath, config, modulesDir)).rejects.toThrow(/404/);
        } finally {
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });
});

describe('uninstallAll', () => {
    it('removes the entire modules directory', async () => {
        const { projectDir, packagePath } = makeProject();
        const externalDir = mkTmpDir('exon-install-src-');
        fs.writeFileSync(path.join(externalDir, 'lib.exon'), '{}');

        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({ mylib: { source: path.relative(projectDir, externalDir) } });
        await installDependencies(packagePath, config, modulesDir);

        expect(fs.existsSync(modulesDir)).toBe(true);
        uninstallAll(modulesDir);
        expect(fs.existsSync(modulesDir)).toBe(false);
    });

    it('does nothing when modulesDir does not exist', () => {
        const { projectDir } = makeProject();
        const modulesDir = path.join(projectDir, 'exon_modules');

        expect(() => uninstallAll(modulesDir)).not.toThrow();
        expect(fs.existsSync(modulesDir)).toBe(false);
    });
});

describe('uninstallDependency', () => {
    it('removes only the named dependency, respecting "retarget"', async () => {
        const { projectDir, packagePath } = makeProject();
        const externalDirA = mkTmpDir('exon-install-src-');
        fs.writeFileSync(path.join(externalDirA, 'a.exon'), '{}');
        const externalDirB = mkTmpDir('exon-install-src-');
        fs.writeFileSync(path.join(externalDirB, 'b.exon'), '{}');

        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({
            http: { retarget: 'otherHttp', source: path.relative(projectDir, externalDirA) },
            keep: { source: path.relative(projectDir, externalDirB) },
        });
        await installDependencies(packagePath, config, modulesDir);

        uninstallDependency(config, modulesDir, 'http');

        expect(fs.existsSync(path.join(modulesDir, 'otherHttp'))).toBe(false);
        expect(fs.existsSync(path.join(modulesDir, 'keep', 'b.exon'))).toBe(true);
    });

    it('throws when the name is not declared in dependencies', () => {
        const { projectDir } = makeProject();
        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({});

        expect(() => uninstallDependency(config, modulesDir, 'missing')).toThrow(/not declared/);
    });

    it('does nothing when the dependency is declared but not installed', () => {
        const { projectDir } = makeProject();
        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({ mylib: { source: '../elsewhere' } });

        expect(() => uninstallDependency(config, modulesDir, 'mylib')).not.toThrow();
    });
});

describe('installNodeDependencies', () => {
    it('does nothing when there are no node dependencies', () => {
        const { projectDir } = makeProject();
        expect(() => installNodeDependencies(projectDir, {})).not.toThrow();
        expect(fs.existsSync(path.join(projectDir, 'node_modules'))).toBe(false);
    });
});
