// SPDX-License-Identifier: MIT

export class ResolverError extends Error {
    public readonly userMessage: string;

    constructor(systemMessage: string, userMessage: string) {
        super(systemMessage);
        this.userMessage = userMessage;
    }
}

export class LocatedError extends ResolverError {
    public readonly locatedFile: string;

    constructor(systemMessage: string, userMessage: string, locatedFile: string) {
        super(systemMessage, userMessage);
        this.locatedFile = locatedFile;
    }
}
