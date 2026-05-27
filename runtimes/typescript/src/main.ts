// SPDX-License-Identifier: MIT

import * as IPC from "./ipc";
import { Parser } from "./Parser";
import { Resolver } from "./Resolver";
import { RuntimeOptions } from "./RuntimeOptions";
import { ScriptRepository } from "./ScriptRepository";
import { IScriptRepository } from "./IScriptRepository";
import { parseArgs } from "./parseArgs";

function printOutput(result: any) {
    if (result instanceof Object) {
        result = JSON.stringify(result, null, 4).replace(/\\\\/g, '\\');
    }

    console.log(result);
}

function parseFile(manager: IScriptRepository, paths: string[], fileName: string) {
    return new Parser(manager, paths).parse(fileName);
}

function runChannel(manager: IScriptRepository, paths: string[], fileName: string, scriptArgv: string[]) {
    const channelOptions = new RuntimeOptions({ run: true, test: false }, scriptArgv);

    process.on('message', (msg: any) => {
        IPC.setMessage(msg);
        try {
            new Resolver(manager, channelOptions).resolve(parseFile(manager, paths, fileName));
        } catch (e) {
            if (process.send) {
                process.send({ __error__: e instanceof Error ? e.message : String(e) });
            }
        }
    });

    if (process.send) {
        process.send({ __ready__: true });
    }
}

function runNormal(manager: IScriptRepository, paths: string[], fileName: string, opts: any, scriptArgv: string[]) {
    try {
        const result = parseFile(manager, paths, fileName);

        if (opts.extended) {
            printOutput(result);
        } else {
            const options = new RuntimeOptions(opts, scriptArgv);
            const resolver = new Resolver(manager, options);
            const output = resolver.resolve(result);

            if (options.shouldPrintOutput()) {
                printOutput(output);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error("[ERROR]:")
        console.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
    }
}

const params = parseArgs(process.argv.slice(2));

const fileName : string = params.targets[0];
const paths : string[] = params.options.path;
const scriptArgv : string[] = params.targets;

const manager = new ScriptRepository();

if (!params.options.bare) {
    // register native components
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Native: { components(): any[] } = require("./fn");
    const components = Native.components();
    for (let i = 0; i < components.length; i++) {
        manager.register(new components[i]);
    }
}

if (params.options.channel) {
    runChannel(manager, paths, fileName, scriptArgv);
} else {
    runNormal(manager, paths, fileName, params.options, scriptArgv);
}
