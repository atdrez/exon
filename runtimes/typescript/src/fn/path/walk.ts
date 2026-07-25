// SPDX-License-Identifier: MIT

import fs from "fs";
import nodePath from "path";
import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

// Never descends into symlinked directories, so a walk can't escape the
// starting directory or loop forever on a symlink cycle. The symlink entry
// itself is still reported if it matches the pattern.
function walkDir(dir: string, regex: RegExp | undefined, depth: number, maxDepth: number, results: string[]): void {
    let names: string[];

    try {
        names = fs.readdirSync(dir);
    }
    catch {
        return;
    }

    for (const name of names) {
        const entryPath = nodePath.join(dir, name);
        const stat = fs.lstatSync(entryPath);

        if (!regex || regex.test(name)) {
            results.push(entryPath);
        }

        if (stat.isDirectory() && (maxDepth < 0 || depth < maxDepth)) {
            walkDir(entryPath, regex, depth + 1, maxDepth, results);
        }
    }
}

export default class Component extends OpUnary {
    constructor() { super("path.walk"); }

    public evaluate(obj: any, value: any, context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} expected path argument as string`);

        if (obj.pattern !== undefined && typeof obj.pattern !== "string")
            throw new Error(`${this.name()}.pattern should be string`);

        if (obj.flags !== undefined && typeof obj.flags !== "string")
            throw new Error(`${this.name()}.flags should be string`);

        if (obj.maxDepth !== undefined && typeof obj.maxDepth !== "number")
            throw new Error(`${this.name()}.maxDepth should be number`);

        const resolved = nodePath.isAbsolute(value)
            ? value
            : nodePath.resolve(nodePath.dirname(context.location.file), value);

        const flags = typeof obj.flags === "string" ? obj.flags : "";
        const regex = typeof obj.pattern === "string" ? new RegExp(obj.pattern, flags) : undefined;
        const maxDepth = typeof obj.maxDepth === "number" ? obj.maxDepth : -1;

        const results: string[] = [];
        walkDir(resolved, regex, 1, maxDepth, results);
        return results;
    }
}
