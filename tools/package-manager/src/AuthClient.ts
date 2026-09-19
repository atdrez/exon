// SPDX-License-Identifier: MIT

import { readErrorMessage, registryApiBase, resolveRegistry } from "./RegistryConfig";

export interface AuthLogger {
    info(message: string): void;
}

export interface LoginResult {
    token: string;
    expiresAt: string;
    sessionId: string;
}

// Decoded for display purposes only (which account "expm login" just signed in as) - the JWT's
// signature is never checked here, since verification is the registry's job and this client
// only reads claims the registry itself just issued a moment earlier.
export interface SessionTokenClaims {
    email: string;
    username: string;
}

const consoleLogger: AuthLogger = {
    info: (message) => console.log(message),
};

export function decodeSessionTokenClaims(token: string): SessionTokenClaims | undefined {
    try {
        const payloadSegment = token.split(".")[1];
        if (payloadSegment === undefined) return undefined;

        const payload = JSON.parse(Buffer.from(payloadSegment, "base64").toString("utf8")) as unknown;

        if (
            typeof payload === "object" && payload !== null &&
            "email" in payload && typeof payload.email === "string" &&
            "username" in payload && typeof payload.username === "string"
        ) {
            return { email: payload.email, username: payload.username };
        }

        return undefined;
    } catch {
        return undefined;
    }
}

// Thin wrapper around the registry's session endpoints (POST /users/login and POST
// /users/logout) - the same session flow the desktop app already drives from
// apps/desktop/src/main/credentialService.ts, adapted for a plain terminal prompt instead of an
// embedded browser window/Electron safeStorage.
export class AuthClient {
    readonly #registry: string;
    readonly #registryApi: string;
    readonly #logger: AuthLogger;

    public constructor(registry?: string, logger: AuthLogger = consoleLogger) {
        this.#registry = resolveRegistry(registry);
        this.#registryApi = registryApiBase(this.#registry);
        this.#logger = logger;
    }

    public get registry(): string {
        return this.#registry;
    }

    public async login(email: string, password: string): Promise<LoginResult> {
        const response = await fetch(`${this.#registryApi}/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            throw new Error(`Login failed: ${await readErrorMessage(response)}`);
        }

        return (await response.json()) as LoginResult;
    }

    // Best-effort: an unreachable registry or an already-expired/-revoked token still means the
    // caller is effectively logged out, so a failure here is only logged - the local session is
    // always cleared afterwards regardless (see runLogout in main.ts).
    public async logout(token: string): Promise<void> {
        const response = await fetch(`${this.#registryApi}/users/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            this.#logger.info(`Warning: registry logout request failed (${await readErrorMessage(response)}); clearing local session anyway.`);
        }
    }
}
