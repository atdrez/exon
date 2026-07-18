// SPDX-License-Identifier: MIT

export class RuntimeOptions {
    public readonly argv: string[] = [];
    public readonly runMode: boolean = false;
    public readonly testMode: boolean = false;
    public readonly route: string[] | null = null;
    public readonly namedArgv: Record<string, string> = {};

    constructor(options: any, argv: string[] = []) {
        this.argv = argv;
        this.route = options.route ?? null;
        this.runMode = options.run ?? false;
        this.testMode = options.test ?? false;
        this.namedArgv = options.namedArgv ?? RuntimeOptions.parseNamedArgv(argv);
    }

    public shouldPrintOutput() : boolean {
        return !this.runMode && !this.testMode;
    }

    private static parseNamedArgv(argv: string[]): Record<string, string> {
        const named: Record<string, string> = {};

        for (const arg of argv) {
            if (typeof arg !== 'string')
                continue;

            const eq = arg.indexOf('=');

            if (eq <= 0)
                continue;

            named[arg.slice(0, eq)] = arg.slice(eq + 1);
        }

        return named;
    }
}
