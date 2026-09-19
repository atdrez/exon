// SPDX-License-Identifier: MIT

export const DEFAULT_REGISTRY = "https://api.exonlang.org";

export function normalizeRegistry(registry: string): string {
    return registry.replace(/\/+$/, "");
}

export function resolveRegistry(explicit?: string): string {
    return normalizeRegistry(explicit ?? process.env.EXON_REGISTRY_API ?? DEFAULT_REGISTRY);
}

export function registryApiBase(registry: string): string {
    return `${normalizeRegistry(registry)}/api/v1`;
}

export async function readErrorMessage(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { code?: string; message?: string };
        return body.message !== undefined ? `${body.code}: ${body.message}` : `${response.status} ${response.statusText}`;
    } catch {
        return `${response.status} ${response.statusText}`;
    }
}
