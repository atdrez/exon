// SPDX-License-Identifier: MIT

export class ResolverError extends Error {
    public readonly userMessage: string;

    constructor(systemMessage: string, userMessage: string) {
        super(systemMessage);
        this.userMessage = userMessage;
    }
}
