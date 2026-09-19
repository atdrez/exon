// SPDX-License-Identifier: MIT

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { runLogin, runLogout } from '../src/main';
import { SessionStore } from '../src/SessionStore';

let tmpDirs: string[] = [];

function mkSessionStore(): SessionStore {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exon-login-logout-'));
    tmpDirs.push(dir);
    return new SessionStore(path.join(dir, 'auth.json'));
}

interface TestServer {
    baseUrl: string;
    close: () => Promise<void>;
}

function startServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<TestServer> {
    return new Promise((resolve) => {
        const server = http.createServer(handler);
        server.listen(0, () => {
            const address = server.address();
            if (address === null || typeof address === 'string') throw new Error('unexpected server address');
            resolve({ baseUrl: `http://127.0.0.1:${address.port}`, close: () => new Promise((r) => server.close(() => r())) });
        });
    });
}

afterEach(() => {
    for (const dir of tmpDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs = [];
    vi.restoreAllMocks();
});

describe('runLogin', () => {
    it('saves the returned session under the resolved registry', async () => {
        const server = await startServer((req, res) => {
            if (req.method === 'POST' && req.url === '/api/v1/users/login') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ token: 'a.b.c', expiresAt: '2026-09-19T00:00:00.000Z', sessionId: 'session-1' }));
                return;
            }
            res.writeHead(404);
            res.end();
        });

        try {
            const sessionStore = mkSessionStore();
            await runLogin(
                ['--registry', server.baseUrl],
                async () => ({ email: 'jane@example.com', password: 'hunter2' }),
                sessionStore
            );

            const session = sessionStore.getSession(server.baseUrl);
            expect(session?.token).toBe('a.b.c');
            expect(session?.sessionId).toBe('session-1');
        } finally {
            await server.close();
        }
    });

    it('reports the registry error and does not save a session on invalid credentials', async () => {
        const server = await startServer((_req, res) => {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' }));
        });

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        try {
            const sessionStore = mkSessionStore();
            await expect(
                runLogin(['--registry', server.baseUrl], async () => ({ email: 'jane@example.com', password: 'wrong' }), sessionStore)
            ).rejects.toThrow('process.exit');

            expect(sessionStore.getSession(server.baseUrl)).toBeUndefined();
            expect(exitSpy).toHaveBeenCalledWith(1);
        } finally {
            await server.close();
        }
    });
});

describe('runLogout', () => {
    it('revokes and clears a stored session', async () => {
        let logoutCalled = false;

        const server = await startServer((req, res) => {
            if (req.method === 'POST' && req.url === '/api/v1/users/logout') {
                logoutCalled = true;
                expect(req.headers.authorization).toBe('Bearer stored-token');
                res.writeHead(200);
                res.end();
                return;
            }
            res.writeHead(404);
            res.end();
        });

        try {
            const sessionStore = mkSessionStore();
            sessionStore.saveSession(server.baseUrl, {
                token: 'stored-token',
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
                sessionId: 'session-1',
                email: 'jane@example.com',
                username: 'jane',
            });

            await runLogout(['--registry', server.baseUrl], sessionStore);

            expect(logoutCalled).toBe(true);
            expect(sessionStore.getSession(server.baseUrl)).toBeUndefined();
        } finally {
            await server.close();
        }
    });

    it('is a no-op when no session is stored for the registry', async () => {
        const sessionStore = mkSessionStore();
        await expect(runLogout(['--registry', 'https://never-called.example'], sessionStore)).resolves.toBeUndefined();
    });
});
