// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";
import * as OS from "os";
import { normalizeRegistry } from "./RegistryConfig";

export interface StoredSession {
    token: string;
    expiresAt: string;
    sessionId: string;
    email: string;
    username: string;
}

const DEFAULT_AUTH_FILE = Path.join(OS.homedir(), ".exon", "auth.json");

// Local cache of the sessions created by "expm login", one per registry, so "expm publish" and
// "expm install" can fall back to a stored session token when EXON_REGISTRY_TOKEN is not set.
// Keeping the file-reading logic in one class (rather than letting PackagePublisher and
// PackageInstaller each grow their own copy) follows the same "extract first, then import" rule
// CLAUDE.md calls out for registryApiUrl() - see the "Working with modules/exon" note there.
export class SessionStore {
    readonly #filePath: string;

    public constructor(filePath: string = DEFAULT_AUTH_FILE) {
        this.#filePath = filePath;
    }

    // undefined for both a missing session and an expired one, so callers never need to
    // separately check expiry before falling back to EXON_REGISTRY_TOKEN or failing outright.
    public getSession(registry: string): StoredSession | undefined {
        const session = this.#readAll()[normalizeRegistry(registry)];

        if (session === undefined || new Date(session.expiresAt).getTime() <= Date.now()) {
            return undefined;
        }

        return session;
    }

    public saveSession(registry: string, session: StoredSession): void {
        const sessions = this.#readAll();
        sessions[normalizeRegistry(registry)] = session;
        this.#writeAll(sessions);
    }

    public clearSession(registry: string): void {
        const sessions = this.#readAll();
        delete sessions[normalizeRegistry(registry)];
        this.#writeAll(sessions);
    }

    #readAll(): Record<string, StoredSession> {
        if (!FileSystem.existsSync(this.#filePath)) {
            return {};
        }

        try {
            return JSON.parse(FileSystem.readFileSync(this.#filePath, "utf8")) as Record<string, StoredSession>;
        } catch {
            return {};
        }
    }

    // The file holds bearer tokens, so it is written owner-read/write only (0600), in a
    // directory created 0700 - mirroring the access an ~/.ssh or ~/.aws credentials file gets,
    // since this Node CLI has no Electron safeStorage/OS keychain to encrypt it with instead.
    #writeAll(sessions: Record<string, StoredSession>): void {
        FileSystem.mkdirSync(Path.dirname(this.#filePath), { recursive: true, mode: 0o700 });
        FileSystem.writeFileSync(this.#filePath, `${JSON.stringify(sessions, null, 4)}\n`, { mode: 0o600 });
        FileSystem.chmodSync(this.#filePath, 0o600);
    }
}
