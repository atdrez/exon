// SPDX-License-Identifier: MIT

import { Context } from "../../Context";
import { execSync } from "child_process";
import { OpVariadic } from "../opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("process.exec", 1); }

    public evaluate(_obj: any, values: Array<any>, context: Context) : any {
        const cmd = values.join("");

        try {
            return execSync(cmd).toString();
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