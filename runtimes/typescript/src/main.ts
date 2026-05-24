// SPDX-License-Identifier: MIT

import  * as argv from "argv";
import * as IPC from "./ipc";
import { Parser } from "./Parser";
import { Resolver } from "./Resolver";
import { RuntimeOptions } from "./RuntimeOptions";
import { ScriptRepository } from "./ScriptRepository";
import { IScriptRepository } from "./IScriptRepository";

const options = [
    { name: 'extended', short: 'e', type: 'boolean'},
    { name: 'path', short: 'p', type: 'list,path'},
    { name: 'test', short: 't', type: 'boolean'},
    { name: 'run', short: 'r', type: 'boolean'},
    { name: 'channel', short: 'c', type: 'boolean'},
    { name: 'bare', short: 'b', type: 'boolean'},
];

function printOutput(result: any) {
    if (result instanceof Object) {
        result = JSON.stringify(result, null, 4).replace(/\\\\/g, '\\');
    }

    console.log(result);
}

function parseFile(manager: IScriptRepository, paths: string[], fileName: string) {
    return new Parser(manager, paths).parse(fileName);
}

function runChannel(manager: IScriptRepository, paths: string[], fileName: string) {
    const channelOptions = new RuntimeOptions({ run: true, test: false });

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

function runNormal(manager: IScriptRepository, paths: string[], fileName: string, opts: any) {
    try {
        const result = parseFile(manager, paths, fileName);

        if (opts.extended) {
            printOutput(result);
        } else {
            const options = new RuntimeOptions(opts);
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

const params = argv.option(options).run();

const fileName : string = params.targets[0];
const paths : string[] = params.options.path;

const manager = new ScriptRepository();

if (!params.options.bare) {
    // register native components
    const Native: { components(): any[] } = require("./fn");

    const components = Native.components();
    for (let i = 0; i < components.length; i++) {
        manager.register(new components[i]);
    }
}

if (params.options.channel) {
    runChannel(manager, paths, fileName);
} else {
    runNormal(manager, paths, fileName, params.options);
}
