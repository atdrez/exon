// SPDX-License-Identifier: MIT

export class RuntimeOptions {
    public readonly runMode: boolean = false;
    public readonly testMode: boolean = false;

    constructor(options: any) {
        this.runMode = options.run;
        this.testMode = options.test;
    }

    public shouldPrintOutput() : boolean {
        return !this.runMode && !this.testMode;
    }
}
