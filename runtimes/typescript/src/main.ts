// SPDX-License-Identifier: MIT

import { Parser } from "./Parser";
import { Resolver } from "./Resolver";
import { RuntimeOptions } from "./RuntimeOptions";
import { ScriptRepository } from "./ScriptRepository";
import { IScriptRepository } from "./IScriptRepository";
import { parseArgs } from "./parseArgs";
import { loadNativeExtensions } from "./NativeExtensionLoader";

function printOutput(result: any) {
    if (result instanceof Object) {
        result = JSON.stringify(result, null, 4).replace(/\\\\/g, '\\');
    }

    console.log(result);
}

function parseFile(manager: IScriptRepository, paths: string[], fileName: string) {
    return new Parser(manager, paths).parse(fileName);
}

function runNormal(manager: IScriptRepository, paths: string[], fileName: string, opts: any, scriptArgv: string[]) {
    try {
        const result = parseFile(manager, paths, fileName);

        if (opts.extended) {
            printOutput(result);
        } else {
            const options = new RuntimeOptions(opts, scriptArgv);
            const output = Resolver.execute(manager, result, options);

            if (options.shouldPrintOutput() && output !== null && output !== undefined) {
                printOutput(output);
            }
        }
    } catch (e) {
        console.error("[ERROR]:")
        console.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
    }
}

export function execute() {

    const params = parseArgs(process.argv.slice(2));

    const fileName : string = params.targets[0];
    const paths : string[] = params.options.path;
    const scriptArgv : string[] = params.targets;

    const manager = new ScriptRepository();

    if (!params.options.bare) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Native: { components(): any[] } = require("./fn");
        const components = Native.components();
        for (let i = 0; i < components.length; i++) {
            manager.register(new components[i]);
        }

        for (const searchPath of paths) {
            loadNativeExtensions(manager, searchPath);
        }
    }

    runNormal(manager, paths, fileName, params.options, scriptArgv);
}

if (process.argv[1] === __filename) {
    execute();
}