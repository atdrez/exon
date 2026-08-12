// SPDX-License-Identifier: MIT

import * as Crypto from "crypto";
import * as FileSystem from "fs";
import type { PackageAuthor, PackageRepository } from "exon-runtime";

export interface PublishLogger {
    info(message: string): void;
}

export interface PublishOptions {
    registry?: string;
    token?: string;
}

// Metadata read off exon-package.json (see PackageConfig) and forwarded to the registry on
// publish. All optional - a package.publish request is valid with only name/version/size/hash.
export interface PublishMetadata {
    description?: string;
    license?: string;
    category?: string;
    homepage?: string;
    repository?: PackageRepository;
    author?: PackageAuthor;
}

export interface PublishedPackage {
    owner: string;
    name: string;
    version: string;
    description: string;
    size: number;
    hash: string;
    createdAt: string;
    downloadUrl: string;
    license?: string;
    category?: string;
    homepage?: string;
    repository?: PackageRepository;
    author?: PackageAuthor;
}

interface PresignedUploadPart {
    partNumber: number;
    url: string;
}

interface CreatePackageRequestResponse {
    requestId: string;
    key: string;
    uploadId: string;
    parts: PresignedUploadPart[];
}

interface CompletedUploadPart {
    partNumber: number;
    eTag: string;
}

const consoleLogger: PublishLogger = {
    info: (message) => console.log(message),
};

const DEFAULT_REGISTRY = "https://packages.exonlang.org";

// Must match MULTIPART_UPLOAD_PART_SIZE_BYTES in the backend's storageService, since the number
// of presigned parts returned by "POST /packages" only makes sense when parts are sliced at the
// same boundaries the backend used to presign them.
const MULTIPART_UPLOAD_PART_SIZE_BYTES = 8 * 1024 * 1024;

async function readErrorMessage(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { code?: string; message?: string };
        return body.message !== undefined ? `${body.code}: ${body.message}` : `${response.status} ${response.statusText}`;
    } catch {
        return `${response.status} ${response.statusText}`;
    }
}

// Publishes a packed .expkg archive to the exon package registry, following the three-step
// direct-to-storage upload flow described in backend/docs/api.md: declare the package and get
// presigned upload-part URLs, upload every part straight to storage, then report the uploaded
// parts back so the registry can finalize and publish it.
export class PackagePublisher {
    readonly #registryApi: string;
    readonly #token: string;
    readonly #logger: PublishLogger;

    public constructor(options: PublishOptions = {}, logger: PublishLogger = consoleLogger) {
        const registry = options.registry ?? process.env.EXON_REGISTRY_API ?? DEFAULT_REGISTRY;
        this.#registryApi = `${registry.replace(/\/+$/, "")}/api/v1`;

        const token = options.token ?? process.env.EXON_REGISTRY_TOKEN;

        if (token === undefined || token.length === 0) {
            throw new Error("No registry auth token found. Set the EXON_REGISTRY_TOKEN environment variable.");
        }
        this.#token = token;

        this.#logger = logger;
    }

    public async publish(archivePath: string, name: string, version: string, metadata: PublishMetadata = {}): Promise<PublishedPackage> {
        const content = FileSystem.readFileSync(archivePath);
        const hash = Crypto.createHash("sha256").update(content).digest("hex");

        this.#logger.info(`Publishing "${name}" ${version} (${content.length} bytes) ...`);

        const created = await this.#createRequest(name, version, metadata, content.length, hash);

        this.#logger.info(`Uploading ${created.parts.length} part(s) ...`);
        const parts = await this.#uploadParts(content, created.parts);

        this.#logger.info("Finalizing publish ...");
        const published = await this.#completeRequest(created.requestId, parts);

        this.#logger.info(`Published "${published.name}" ${published.version}.`);
        return published;
    }

    async #createRequest(
        name: string, version: string, metadata: PublishMetadata, size: number, hash: string
    ): Promise<CreatePackageRequestResponse> {
        return this.#postJson<CreatePackageRequestResponse>("/packages", {
            name,
            version,
            size,
            hash,
            description: metadata.description,
            license: metadata.license,
            category: metadata.category,
            homepage: metadata.homepage,
            repository: metadata.repository,
            author: metadata.author,
        });
    }

    async #uploadParts(content: Buffer, parts: PresignedUploadPart[]): Promise<CompletedUploadPart[]> {
        const completed: CompletedUploadPart[] = [];

        for (const part of parts) {
            const start = (part.partNumber - 1) * MULTIPART_UPLOAD_PART_SIZE_BYTES;
            const end = Math.min(start + MULTIPART_UPLOAD_PART_SIZE_BYTES, content.length);
            const chunk = new Uint8Array(content.subarray(start, end));

            const response = await fetch(part.url, { method: "PUT", body: chunk });

            if (!response.ok) {
                throw new Error(`Failed to upload part ${part.partNumber}: ${response.status} ${response.statusText}`);
            }

            const eTag = response.headers.get("etag");

            if (eTag === null) {
                throw new Error(`Upload of part ${part.partNumber} did not return an ETag header.`);
            }

            completed.push({ partNumber: part.partNumber, eTag });
            this.#logger.info(`Uploaded part ${part.partNumber}/${parts.length}.`);
        }

        return completed;
    }

    async #completeRequest(requestId: string, parts: CompletedUploadPart[]): Promise<PublishedPackage> {
        return this.#postJson<PublishedPackage>(`/package-request/${requestId}/complete`, { parts });
    }

    async #postJson<T>(path: string, body: unknown): Promise<T> {
        const response = await fetch(`${this.#registryApi}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.#token}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Request to ${path} failed: ${await readErrorMessage(response)}`);
        }

        return (await response.json()) as T;
    }
}
