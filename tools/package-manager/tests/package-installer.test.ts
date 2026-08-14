// SPDX-License-Identifier: MIT

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as crypto from 'crypto';
import * as tar from 'tar';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { installDependencies, installNodeDependencies, uninstallAll, uninstallDependency } from '../src/PackageInstaller';
import type { PackageConfig } from 'exon-runtime';

let tmpDirs: string[] = [];

beforeEach(() => {
    vi.stubEnv('EXON_REGISTRY_TOKEN', 'test-token');
});

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

async function makeArchive(files: Record<string, string>): Promise<Buffer> {
    const contentDir = mkTmpDir('exon-install-archive-');

    for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(contentDir, name), content);
    }

    const archivePath = path.join(mkTmpDir('exon-install-tar-'), 'pkg.expkg');
    await tar.c({ gzip: true, file: archivePath, cwd: contentDir }, Object.keys(files));
    return fs.readFileSync(archivePath);
}

interface ServedPackage {
    archive: Buffer;
    // Override the hash reported by the metadata endpoint, to simulate a corrupted download.
    hash?: string;
}

const API_PREFIX = '/api/v1/packages/';

// Serves the same two-step, Bearer-authenticated shape the real registry backend does: a
// metadata endpoint carrying the published hash, and a download endpoint for the archive
// itself, keyed by "name/version" (name may itself contain "/" for scoped packages).
function startServer(packages: Record<string, ServedPackage>): Promise<{ baseUrl: string; close: () => Promise<void> }> {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const url = req.url ?? '';

            if (!url.startsWith(API_PREFIX)) {
                res.writeHead(404);
                res.end('not found');
                return;
            }

            const isDownload = url.endsWith('/download');
            const pathPart = isDownload ? url.slice(API_PREFIX.length, -'/download'.length) : url.slice(API_PREFIX.length);
            const segments = pathPart.split('/');
            const version = segments.pop();
            const key = `${segments.join('/')}/${version}`;
            const served = packages[key];

            if (served === undefined) {
                res.writeHead(404);
                res.end('not found');
                return;
            }

            if (req.headers.authorization !== 'Bearer test-token') {
                res.writeHead(401);
                res.end('unauthorized');
                return;
            }

            if (isDownload) {
                res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                res.end(served.archive);
                return;
            }

            const hash = served.hash ?? crypto.createHash('sha256').update(served.archive).digest('hex');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ hash, downloadUrl: `${API_PREFIX}${key}/download` }));
        });

        server.listen(0, () => {
            const address = server.address();
            if (address === null || typeof address === 'string') throw new Error('unexpected server address');

            resolve({
                baseUrl: `http://127.0.0.1:${address.port}`,
                close: () => new Promise((r) => server.close(() => r())),
            });
        });
    });
}

afterEach(() => {
    for (const dir of tmpDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs = [];
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('installDependencies: URL construction', () => {
    it('builds the metadata URL from name and version against the default registry when "registry" is omitted', async () => {
        const { projectDir, packagePath } = makeProject();
        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({ 'std/flow': { version: '0.1.0' } });

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }));

        await expect(installDependencies(packagePath, config, modulesDir)).rejects.toThrow(
            'https://api.exonlang.org/api/v1/packages/std/flow/0.1.0'
        );
    });

    it('uses a custom "registry" when provided', async () => {
        const { projectDir, packagePath } = makeProject();
        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({ 'std/shaderlab': { version: '0.1.0', registry: 'https://abc.org' } });

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }));

        await expect(installDependencies(packagePath, config, modulesDir)).rejects.toThrow(
            'https://abc.org/api/v1/packages/std/shaderlab/0.1.0'
        );
    });

    it('throws a clear error when EXON_REGISTRY_TOKEN is not set', async () => {
        vi.unstubAllEnvs();
        const { projectDir, packagePath } = makeProject();
        const modulesDir = path.join(projectDir, 'exon_modules');
        const config = makeConfig({ ui: { version: '1.0.0' } });

        await expect(installDependencies(packagePath, config, modulesDir)).rejects.toThrow(/EXON_REGISTRY_TOKEN/);
    });
});

describe('installDependencies: http downloads', () => {
    it('downloads and extracts a .expkg archive into exon_modules/<name>', async () => {
        const { projectDir, packagePath } = makeProject();
        const archive = await makeArchive({ 'index.exon': '{ served: true }' });
        const { baseUrl, close } = await startServer({ 'ui/1.0.0': { archive } });

        try {
            const modulesDir = path.join(projectDir, 'exon_modules');
            const config = makeConfig({ ui: { version: '1.0.0', registry: baseUrl } });

            await installDependencies(packagePath, config, modulesDir);

            const extracted = path.join(modulesDir, 'ui', 'index.exon');
            expect(fs.existsSync(extracted)).toBe(true);
            expect(fs.readFileSync(extracted, 'utf8')).toBe('{ served: true }');
        } finally {
            await close();
        }
    });

    it('nests a scoped/namespaced dependency name into matching subdirectories in exon_modules', async () => {
        const { projectDir, packagePath } = makeProject();
        const archive = await makeArchive({ 'lib.exon': '{}' });
        const { baseUrl, close } = await startServer({ 'std/utils/math/2.0.0': { archive } });

        try {
            const modulesDir = path.join(projectDir, 'exon_modules');
            const config = makeConfig({ 'std/utils/math': { version: '2.0.0', registry: baseUrl } });

            await installDependencies(packagePath, config, modulesDir);

            expect(fs.existsSync(path.join(modulesDir, 'std', 'utils', 'math', 'lib.exon'))).toBe(true);
        } finally {
            await close();
        }
    });

    it('throws a clear error on a non-2xx response', async () => {
        const { projectDir, packagePath } = makeProject();
        const { baseUrl, close } = await startServer({});

        try {
            const modulesDir = path.join(projectDir, 'exon_modules');
            const config = makeConfig({ ui: { version: '1.0.0', registry: baseUrl } });

            await expect(installDependencies(packagePath, config, modulesDir)).rejects.toThrow(/404/);
        } finally {
            await close();
        }
    });

    it('throws a checksum mismatch error when the downloaded archive does not match the published hash', async () => {
        const { projectDir, packagePath } = makeProject();
        const archive = await makeArchive({ 'index.exon': '{}' });
        const { baseUrl, close } = await startServer({ 'ui/1.0.0': { archive, hash: 'deadbeef' } });

        try {
            const modulesDir = path.join(projectDir, 'exon_modules');
            const config = makeConfig({ ui: { version: '1.0.0', registry: baseUrl } });

            await expect(installDependencies(packagePath, config, modulesDir)).rejects.toThrow(/checksum mismatch/i);
            expect(fs.existsSync(path.join(modulesDir, 'ui'))).toBe(false);
        } finally {
            await close();
        }
    });

    it('does nothing when there are no dependencies', async () => {
        const { projectDir, packagePath } = makeProject();
        const modulesDir = path.join(projectDir, 'exon_modules');

        await installDependencies(packagePath, makeConfig({}), modulesDir);

        expect(fs.existsSync(modulesDir)).toBe(false);
    });
});

describe('installDependencies: transitive nodeDependencies', () => {
    it("returns a dependency's nodeDependencies without installing them on the spot", async () => {
        const { projectDir, packagePath } = makeProject();
        const archive = await makeArchive({
            'exon-package.json': JSON.stringify({
                entry: 'main.exon',
                scripts: {},
                dependencies: {},
                nodeDependencies: { 'some-pkg': '^1.0.0' },
            }),
        });
        const { baseUrl, close } = await startServer({ 'mylib/1.0.0': { archive } });

        try {
            const modulesDir = path.join(projectDir, 'exon_modules');
            const config = makeConfig({ mylib: { version: '1.0.0', registry: baseUrl } });

            const nodeDependencies = await installDependencies(packagePath, config, modulesDir);

            expect(nodeDependencies).toEqual({ 'some-pkg': '^1.0.0' });
            expect(fs.existsSync(path.join(projectDir, 'node_modules'))).toBe(false);
        } finally {
            await close();
        }
    });

    it('merges nodeDependencies from every package in the graph into one map - the fix for ' +
       '`npm install --no-save` pruning packages added by an earlier, separate npm install call', async () => {
        const { projectDir, packagePath } = makeProject();

        // A depends on B; both declare their own, distinct nodeDependencies. Before the fix,
        // each was installed via its own separate `npm install` call, and the later call
        // (for B) silently pruned whatever the earlier call (for A) had just installed.
        const archiveB = await makeArchive({
            'exon-package.json': JSON.stringify({
                entry: 'main.exon',
                scripts: {},
                dependencies: {},
                nodeDependencies: { 'pkg-b': '^2.0.0' },
            }),
        });

        const { baseUrl, close } = await startServer({ 'b/1.0.0': { archive: archiveB } });

        try {
            const archiveA = await makeArchive({
                'exon-package.json': JSON.stringify({
                    entry: 'main.exon',
                    scripts: {},
                    dependencies: { b: { version: '1.0.0', registry: baseUrl } },
                    nodeDependencies: { 'pkg-a': '^1.0.0' },
                }),
            });

            const { baseUrl: rootUrl, close: closeRoot } = await startServer({ 'a/1.0.0': { archive: archiveA } });

            try {
                const modulesDir = path.join(projectDir, 'exon_modules');
                const config = makeConfig({ a: { version: '1.0.0', registry: rootUrl } });

                const nodeDependencies = await installDependencies(packagePath, config, modulesDir);

                expect(nodeDependencies).toEqual({ 'pkg-a': '^1.0.0', 'pkg-b': '^2.0.0' });
            } finally {
                await closeRoot();
            }
        } finally {
            await close();
        }
    });
});

describe('uninstallAll', () => {
    it('removes the entire modules directory', async () => {
        const { projectDir, packagePath } = makeProject();
        const archive = await makeArchive({ 'lib.exon': '{}' });
        const { baseUrl, close } = await startServer({ 'mylib/1.0.0': { archive } });

        try {
            const modulesDir = path.join(projectDir, 'exon_modules');
            const config = makeConfig({ mylib: { version: '1.0.0', registry: baseUrl } });
            await installDependencies(packagePath, config, modulesDir);

            expect(fs.existsSync(modulesDir)).toBe(true);
            uninstallAll(modulesDir);
            expect(fs.existsSync(modulesDir)).toBe(false);
        } finally {
            await close();
        }
    });

    it('does nothing when modulesDir does not exist', () => {
        const { projectDir } = makeProject();
        const modulesDir = path.join(projectDir, 'exon_modules');

        expect(() => uninstallAll(modulesDir)).not.toThrow();
        expect(fs.existsSync(modulesDir)).toBe(false);
    });
});

describe('uninstallDependency', () => {
    it('removes only the named dependency', async () => {
        const { projectDir, packagePath } = makeProject();
        const archiveA = await makeArchive({ 'a.exon': '{}' });
        const archiveB = await makeArchive({ 'b.exon': '{}' });
        const { baseUrl, close } = await startServer({
            'http/1.0.0': { archive: archiveA },
            'keep/1.0.0': { archive: archiveB },
        });

        try {
            const modulesDir = path.join(projectDir, 'exon_modules');
            const config = makeConfig({
                http: { version: '1.0.0', registry: baseUrl },
                keep: { version: '1.0.0', registry: baseUrl },
            });
            await installDependencies(packagePath, config, modulesDir);

            uninstallDependency(config, modulesDir, 'http');

            expect(fs.existsSync(path.join(modulesDir, 'http'))).toBe(false);
            expect(fs.existsSync(path.join(modulesDir, 'keep', 'b.exon'))).toBe(true);
        } finally {
            await close();
        }
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
        const config = makeConfig({ mylib: { version: '1.0.0' } });

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
