// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { execSync, execFileSync } from "child_process";
import { OpVariadic } from "../opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("process.exec", 1); }

    public evaluate(obj: any, values: Array<any>, context: Context) : any {
        const cmd = values.join("");

        const argv = obj.argv;

        if (argv !== undefined) {
            if (!Array.isArray(argv) || argv.some((arg: any) => typeof arg !== "string"))
                throw new Error(`${this.name()}.argv: invalid type (expected array of strings)`);
        }

        const stdin = obj.stdin;

        if (stdin !== undefined && typeof stdin !== "string")
            throw new Error(`${this.name()}.stdin: invalid type (expected string)`);

        const shell = obj.shell;

        if (shell !== undefined && typeof shell !== "boolean")
            throw new Error(`${this.name()}.shell: invalid type (expected boolean)`);

        if (shell !== undefined && argv === undefined)
            throw new Error(`${this.name()}.shell: only valid together with argv`);

        const options: any = {};

        if (stdin !== undefined)
            options.input = stdin;

        if (shell)
            options.shell = true;

        try {
            if (argv !== undefined)
                return execFileSync(cmd, argv, options).toString();

            return execSync(cmd, options).toString();
        } catch (error: any) {
            const stdout = error.stdout ? error.stdout.toString() : "";
            const stderr = error.stderr ? error.stderr.toString() : "";

            let message = error.message;

            if (stdout.length > 0) {
                message += "\n  [STDOUT]: ";
                message += stdout.split("\n").join("\n    ");
            }

            if (stderr.length > 0) {
                message += "\n  [STDERR]: ";
                message += stderr.split("\n").join("\n    ");
            }

            context.rethrow(new Error(message), context.location);
        }
    }
}