// SPDX-License-Identifier: MIT

export class RuntimeOptions {
    public readonly runMode: boolean = false;
    public readonly testMode: boolean = false;
    public readonly argv: string[] = [];

    constructor(options: any, argv: string[] = []) {
        this.runMode = options.run;
        this.testMode = options.test;
        this.argv = argv;
    }

    public shouldPrintOutput() : boolean {
        return !this.runMode && !this.testMode;
    }
}
