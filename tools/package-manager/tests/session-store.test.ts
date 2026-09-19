// SPDX-License-Identifier: MIT

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { SessionStore } from '../src/SessionStore';

let tmpDirs: string[] = [];

function mkTmpFile(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exon-session-store-'));
    tmpDirs.push(dir);
    return path.join(dir, 'nested', 'auth.json');
}

afterEach(() => {
    for (const dir of tmpDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs = [];
});

function makeSession(overrides: Partial<{ expiresAt: string }> = {}) {
    return {
        token: 'a-token',
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60_000).toISOString(),
        sessionId: 'session-1',
        email: 'jane@example.com',
        username: 'jane',
    };
}

describe('SessionStore', () => {
    it('returns undefined when no session file exists yet', () => {
        const store = new SessionStore(mkTmpFile());
        expect(store.getSession('https://api.exonlang.org')).toBeUndefined();
    });

    it('saves and reads back a session for a registry', () => {
        const store = new SessionStore(mkTmpFile());
        const session = makeSession();

        store.saveSession('https://api.exonlang.org', session);

        expect(store.getSession('https://api.exonlang.org')).toEqual(session);
    });

    it('normalizes a trailing slash on the registry key', () => {
        const store = new SessionStore(mkTmpFile());
        const session = makeSession();

        store.saveSession('https://api.exonlang.org/', session);

        expect(store.getSession('https://api.exonlang.org')).toEqual(session);
    });

    it('keeps sessions for different registries independent', () => {
        const store = new SessionStore(mkTmpFile());
        const sessionA = makeSession();
        const sessionB = { ...makeSession(), token: 'other-token', username: 'other' };

        store.saveSession('https://api.exonlang.org', sessionA);
        store.saveSession('https://custom.registry.example', sessionB);

        expect(store.getSession('https://api.exonlang.org')).toEqual(sessionA);
        expect(store.getSession('https://custom.registry.example')).toEqual(sessionB);
    });

    it('treats an expired session as absent', () => {
        const store = new SessionStore(mkTmpFile());
        store.saveSession('https://api.exonlang.org', makeSession({ expiresAt: new Date(Date.now() - 1000).toISOString() }));

        expect(store.getSession('https://api.exonlang.org')).toBeUndefined();
    });

    it('clears a stored session', () => {
        const store = new SessionStore(mkTmpFile());
        store.saveSession('https://api.exonlang.org', makeSession());

        store.clearSession('https://api.exonlang.org');

        expect(store.getSession('https://api.exonlang.org')).toBeUndefined();
    });

    it('writes the auth file with owner-only permissions', () => {
        const filePath = mkTmpFile();
        const store = new SessionStore(filePath);

        store.saveSession('https://api.exonlang.org', makeSession());

        const mode = fs.statSync(filePath).mode & 0o777;
        expect(mode).toBe(0o600);
    });
});
