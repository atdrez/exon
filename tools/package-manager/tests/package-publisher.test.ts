// SPDX-License-Identifier: MIT

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as crypto from 'crypto';
import { describe, it, expect, afterEach } from 'vitest';
import { PackagePublisher } from '../src/PackagePublisher';
import { SessionStore } from '../src/SessionStore';

let tmpDirs: string[] = [];

function mkTmpDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
}

function writeArchive(content: Buffer): string {
    const archivePath = path.join(mkTmpDir('exon-publish-archive-'), 'pkg.expkg');
    fs.writeFileSync(archivePath, content);
    return archivePath;
}

// A SessionStore backed by a file that is never written to in these tests, so construction
// never depends on (or risks reading) whatever the real ~/.exon/auth.json happens to hold on
// the machine running the suite.
function emptySessionStore(): SessionStore {
    return new SessionStore(path.join(mkTmpDir('exon-publish-empty-session-'), 'auth.json'));
}

interface RecordedRequest {
    method: string | undefined;
    url: string | undefined;
    headers: http.IncomingHttpHeaders;
    body: Buffer;
}

interface TestServer {
    baseUrl: string;
    requests: RecordedRequest[];
    close: () => Promise<void>;
}

function startServer(handler: (req: RecordedRequest, res: http.ServerResponse) => void): Promise<TestServer> {
    const requests: RecordedRequest[] = [];

    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const chunks: Buffer[] = [];

            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => {
                const recorded: RecordedRequest = {
                    method: req.method,
                    url: req.url,
                    headers: req.headers,
                    body: Buffer.concat(chunks),
                };
                requests.push(recorded);
                handler(recorded, res);
            });
        });

        server.listen(0, () => {
            const address = server.address();
            if (address === null || typeof address === 'string') throw new Error('unexpected server address');

            resolve({
                baseUrl: `http://127.0.0.1:${address.port}`,
                requests,
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
});

describe('PackagePublisher: construction', () => {
    it('throws when no token is provided, EXON_REGISTRY_TOKEN is not set, and no session is stored', () => {
        const previous = process.env.EXON_REGISTRY_TOKEN;
        delete process.env.EXON_REGISTRY_TOKEN;

        try {
            expect(() => new PackagePublisher({}, undefined, emptySessionStore())).toThrow(/expm login/);
        } finally {
            if (previous !== undefined) process.env.EXON_REGISTRY_TOKEN = previous;
        }
    });

    it('falls back to a session stored by "expm login" when EXON_REGISTRY_TOKEN is not set', () => {
        const previous = process.env.EXON_REGISTRY_TOKEN;
        delete process.env.EXON_REGISTRY_TOKEN;

        const sessionStore = emptySessionStore();
        sessionStore.saveSession('https://registry.example', {
            token: 'stored-session-token',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            sessionId: 'session-1',
            email: 'jane@example.com',
            username: 'jane',
        });

        try {
            expect(() => new PackagePublisher({ registry: 'https://registry.example' }, undefined, sessionStore)).not.toThrow();
        } finally {
            if (previous !== undefined) process.env.EXON_REGISTRY_TOKEN = previous;
        }
    });

    it('prefers EXON_REGISTRY_TOKEN over a stored session when both are present', async () => {
        const content = Buffer.from('bytes');
        const archivePath = writeArchive(content);

        const server = await startServer((req, res) => {
            if (req.method === 'POST' && req.url === '/api/v1/packages') {
                expect(req.headers.authorization).toBe('Bearer env-token');
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ requestId: 'req-5', key: 'k', uploadId: 'u', parts: [] }));
                return;
            }

            if (req.method === 'POST' && req.url === '/api/v1/package-request/req-5/complete') {
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    owner: 'owner-1', name: 'mylib', version: '1.0.0', description: '',
                    size: content.length, hash: 'irrelevant', createdAt: '2026-08-11T00:00:00.000Z',
                    downloadUrl: '/api/v1/packages/mylib/1.0.0/download',
                }));
                return;
            }

            res.writeHead(404);
            res.end('not found');
        });

        const sessionStore = emptySessionStore();
        sessionStore.saveSession(server.baseUrl, {
            token: 'stored-session-token',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            sessionId: 'session-1',
            email: 'jane@example.com',
            username: 'jane',
        });

        const previous = process.env.EXON_REGISTRY_TOKEN;
        process.env.EXON_REGISTRY_TOKEN = 'env-token';

        try {
            const publisher = new PackagePublisher({ registry: server.baseUrl }, undefined, sessionStore);
            await publisher.publish(archivePath, 'mylib', '1.0.0');
        } finally {
            if (previous !== undefined) process.env.EXON_REGISTRY_TOKEN = previous;
            else delete process.env.EXON_REGISTRY_TOKEN;
            await server.close();
        }
    });
});

describe('PackagePublisher: publish', () => {
    it('runs the full three-step flow and returns the published package', async () => {
        const content = Buffer.from('fake archive bytes');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        const archivePath = writeArchive(content);

        const server = await startServer((req, res) => {
            if (req.method === 'POST' && req.url === '/api/v1/packages') {
                expect(req.headers.authorization).toBe('Bearer secret-token');
                const body = JSON.parse(req.body.toString('utf8'));
                expect(body).toEqual({ name: 'mylib', version: '1.0.0', size: content.length, hash });

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    requestId: 'req-1',
                    key: 'mylib@1.0.0/data.expkg',
                    uploadId: 'upload-1',
                    parts: [{ partNumber: 1, url: `${server.baseUrl}/upload/part1` }],
                }));
                return;
            }

            if (req.method === 'PUT' && req.url === '/upload/part1') {
                expect(req.body).toEqual(content);
                res.writeHead(200, { ETag: '"etag-1"' });
                res.end();
                return;
            }

            if (req.method === 'POST' && req.url === '/api/v1/package-request/req-1/complete') {
                expect(req.headers.authorization).toBe('Bearer secret-token');
                const body = JSON.parse(req.body.toString('utf8'));
                expect(body).toEqual({ parts: [{ partNumber: 1, eTag: '"etag-1"' }] });

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    owner: 'owner-1',
                    name: 'mylib',
                    version: '1.0.0',
                    description: '',
                    size: content.length,
                    hash,
                    createdAt: '2026-08-11T00:00:00.000Z',
                    downloadUrl: '/api/v1/packages/mylib/1.0.0/download',
                }));
                return;
            }

            res.writeHead(404);
            res.end('not found');
        });

        try {
            const publisher = new PackagePublisher({ registry: server.baseUrl, token: 'secret-token' });
            const published = await publisher.publish(archivePath, 'mylib', '1.0.0');

            expect(published.name).toBe('mylib');
            expect(published.downloadUrl).toBe('/api/v1/packages/mylib/1.0.0/download');
        } finally {
            await server.close();
        }
    });

    it('splits the archive into one PUT per presigned part, on 8 MiB boundaries', async () => {
        const partSize = 8 * 1024 * 1024;
        const content = crypto.randomBytes(partSize + 100);
        const archivePath = writeArchive(content);

        const uploadedChunkLengths: number[] = [];

        const server = await startServer((req, res) => {
            if (req.method === 'POST' && req.url === '/api/v1/packages') {
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    requestId: 'req-2',
                    key: 'mylib@1.0.0/data.expkg',
                    uploadId: 'upload-2',
                    parts: [
                        { partNumber: 1, url: `${server.baseUrl}/upload/part1` },
                        { partNumber: 2, url: `${server.baseUrl}/upload/part2` },
                    ],
                }));
                return;
            }

            if (req.method === 'PUT' && (req.url === '/upload/part1' || req.url === '/upload/part2')) {
                uploadedChunkLengths.push(req.body.length);
                res.writeHead(200, { ETag: `"etag-${req.url?.slice(-1)}"` });
                res.end();
                return;
            }

            if (req.method === 'POST' && req.url === '/api/v1/package-request/req-2/complete') {
                const body = JSON.parse(req.body.toString('utf8'));
                expect(body.parts).toEqual([
                    { partNumber: 1, eTag: '"etag-1"' },
                    { partNumber: 2, eTag: '"etag-2"' },
                ]);

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    owner: 'owner-1',
                    name: 'mylib',
                    version: '1.0.0',
                    description: '',
                    size: content.length,
                    hash: crypto.createHash('sha256').update(content).digest('hex'),
                    createdAt: '2026-08-11T00:00:00.000Z',
                    downloadUrl: '/api/v1/packages/mylib/1.0.0/download',
                }));
                return;
            }

            res.writeHead(404);
            res.end('not found');
        });

        try {
            const publisher = new PackagePublisher({ registry: server.baseUrl, token: 'secret-token' });
            await publisher.publish(archivePath, 'mylib', '1.0.0');

            expect(uploadedChunkLengths).toEqual([partSize, 100]);
        } finally {
            await server.close();
        }
    });

    it('rejects with the registry error code and message when step 1 fails', async () => {
        const archivePath = writeArchive(Buffer.from('bytes'));

        const server = await startServer((req, res) => {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'FORBIDDEN', message: 'Scope does not match your username.' }));
        });

        try {
            const publisher = new PackagePublisher({ registry: server.baseUrl, token: 'secret-token' });
            await expect(publisher.publish(archivePath, '+other/lib', '1.0.0')).rejects.toThrow(
                /FORBIDDEN: Scope does not match your username\./
            );
        } finally {
            await server.close();
        }
    });

    it('forwards optional category/homepage/repository/author metadata to the create-request step', async () => {
        const content = Buffer.from('fake archive bytes');
        const archivePath = writeArchive(content);

        const server = await startServer((req, res) => {
            if (req.method === 'POST' && req.url === '/api/v1/packages') {
                const body = JSON.parse(req.body.toString('utf8'));
                expect(body).toEqual({
                    name: 'mylib',
                    version: '1.0.0',
                    size: content.length,
                    hash: crypto.createHash('sha256').update(content).digest('hex'),
                    description: 'A test library.',
                    license: 'MIT',
                    category: 'examples',
                    homepage: 'https://example.com',
                    repository: { type: 'git', url: 'https://github.com/org/repo.git' },
                    author: { name: 'Jane Doe', email: 'jane@example.com' },
                });

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    requestId: 'req-4',
                    key: 'mylib@1.0.0/data.expkg',
                    uploadId: 'upload-4',
                    parts: [{ partNumber: 1, url: `${server.baseUrl}/upload/part1` }],
                }));
                return;
            }

            if (req.method === 'PUT' && req.url === '/upload/part1') {
                res.writeHead(200, { ETag: '"etag-1"' });
                res.end();
                return;
            }

            if (req.method === 'POST' && req.url === '/api/v1/package-request/req-4/complete') {
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    owner: 'owner-1',
                    name: 'mylib',
                    version: '1.0.0',
                    description: 'A test library.',
                    size: content.length,
                    hash: crypto.createHash('sha256').update(content).digest('hex'),
                    createdAt: '2026-08-11T00:00:00.000Z',
                    downloadUrl: '/api/v1/packages/mylib/1.0.0/download',
                    license: 'MIT',
                    category: 'examples',
                }));
                return;
            }

            res.writeHead(404);
            res.end('not found');
        });

        try {
            const publisher = new PackagePublisher({ registry: server.baseUrl, token: 'secret-token' });
            const published = await publisher.publish(archivePath, 'mylib', '1.0.0', {
                description: 'A test library.',
                license: 'MIT',
                category: 'examples',
                homepage: 'https://example.com',
                repository: { type: 'git', url: 'https://github.com/org/repo.git' },
                author: { name: 'Jane Doe', email: 'jane@example.com' },
            });

            expect(published.category).toBe('examples');
            expect(published.license).toBe('MIT');
        } finally {
            await server.close();
        }
    });

    it('rejects when a part upload does not return an ETag header', async () => {
        const archivePath = writeArchive(Buffer.from('bytes'));

        const server = await startServer((req, res) => {
            if (req.method === 'POST' && req.url === '/api/v1/packages') {
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    requestId: 'req-3',
                    key: 'mylib@1.0.0/data.expkg',
                    uploadId: 'upload-3',
                    parts: [{ partNumber: 1, url: `${server.baseUrl}/upload/part1` }],
                }));
                return;
            }

            if (req.method === 'PUT' && req.url === '/upload/part1') {
                res.writeHead(200);
                res.end();
                return;
            }

            res.writeHead(404);
            res.end('not found');
        });

        try {
            const publisher = new PackagePublisher({ registry: server.baseUrl, token: 'secret-token' });
            await expect(publisher.publish(archivePath, 'mylib', '1.0.0')).rejects.toThrow(/did not return an ETag/);
        } finally {
            await server.close();
        }
    });
});
