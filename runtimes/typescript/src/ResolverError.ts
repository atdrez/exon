// SPDX-License-Identifier: MIT

export class ResolverError extends Error {
    public readonly userMessage: string;

    constructor(systemMessage: string, userMessage: string) {
        super(systemMessage);
        this.userMessage = userMessage;
    }
}

export type CallSite = { file: string; line: number };

export class LocatedError extends ResolverError {
    public readonly locatedFile: string;
    public readonly callStack: readonly CallSite[];

    constructor(userMessage: string, locatedFile: string, callStack: readonly CallSite[] = []) {
        const location = callStack.length > 0
            ? callStack.map(s => `  [${s.file}:${s.line}]`).join('\n') + '\n' + userMessage
            : userMessage;
        super(location, userMessage);
        this.locatedFile = locatedFile;
        this.callStack = callStack;
    }
}
