// SPDX-License-Identifier: MIT

import * as http from 'http';
import { describe, it, expect } from 'vitest';
import { AuthClient, decodeSessionTokenClaims } from '../src/AuthClient';

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

function makeToken(payload: Record<string, unknown>): string {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64');
    return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
}

describe('AuthClient: login', () => {
    it('posts credentials and returns the issued session', async () => {
        const server = await startServer((req, res) => {
            expect(req.method).toBe('POST');
            expect(req.url).toBe('/api/v1/users/login');
            expect(JSON.parse(req.body.toString('utf8'))).toEqual({ email: 'jane@example.com', password: 'hunter2' });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ token: 'session-token', expiresAt: '2026-09-19T00:00:00.000Z', sessionId: 'session-1' }));
        });

        try {
            const client = new AuthClient(server.baseUrl);
            const result = await client.login('jane@example.com', 'hunter2');

            expect(result).toEqual({ token: 'session-token', expiresAt: '2026-09-19T00:00:00.000Z', sessionId: 'session-1' });
        } finally {
            await server.close();
        }
    });

    it('rejects with the registry error code and message on invalid credentials', async () => {
        const server = await startServer((_req, res) => {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' }));
        });

        try {
            const client = new AuthClient(server.baseUrl);
            await expect(client.login('jane@example.com', 'wrong')).rejects.toThrow(
                /INVALID_CREDENTIALS: Email or password is incorrect\./
            );
        } finally {
            await server.close();
        }
    });
});

describe('AuthClient: logout', () => {
    it('sends the bearer token to the logout endpoint', async () => {
        const server = await startServer((req, res) => {
            expect(req.method).toBe('POST');
            expect(req.url).toBe('/api/v1/users/logout');
            expect(req.headers.authorization).toBe('Bearer session-token');
            res.writeHead(200);
            res.end();
        });

        try {
            const client = new AuthClient(server.baseUrl);
            await expect(client.logout('session-token')).resolves.toBeUndefined();
        } finally {
            await server.close();
        }
    });

    it('does not throw when the registry rejects an already-invalid token', async () => {
        const logs: string[] = [];
        const server = await startServer((_req, res) => {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'INVALID_TOKEN', message: 'The provided token is invalid or has expired.' }));
        });

        try {
            const client = new AuthClient(server.baseUrl, { info: (message) => logs.push(message) });
            await expect(client.logout('stale-token')).resolves.toBeUndefined();
            expect(logs.some((message) => message.includes('INVALID_TOKEN'))).toBe(true);
        } finally {
            await server.close();
        }
    });
});

describe('decodeSessionTokenClaims', () => {
    it('decodes the email and username from a session token payload', () => {
        const token = makeToken({ userId: 'u1', email: 'jane@example.com', username: 'jane', sessionId: 's1' });
        expect(decodeSessionTokenClaims(token)).toEqual({ email: 'jane@example.com', username: 'jane' });
    });

    it('returns undefined for a malformed token', () => {
        expect(decodeSessionTokenClaims('not-a-jwt')).toBeUndefined();
    });
});
