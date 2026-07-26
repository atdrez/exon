// SPDX-License-Identifier: MIT

import { spawnSync } from "child_process";

import { Parser } from "./Parser";
import { Resolver } from "./Resolver";
import { RuntimeOptions } from "./RuntimeOptions";
import { ScriptRepository } from "./ScriptRepository";
import { IScriptRepository } from "./IScriptRepository";
import { parseArgs } from "./parseArgs";
import { loadNativeExtensions } from "./NativeExtensionLoader";
import { findProject, resolveProjectForTarget, resolveEntryFile, isDirectoryTarget, ExonProject, PACKAGE_FILE_NAME } from "./Project";

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

function reportError(message: string): never {
    console.error("[ERROR]:");
    console.error(message);
    return process.exit(1) as never;
}

function requireProject(dir: string): ExonProject {
    const project = findProject(dir);

    if (project === null) {
        reportError(`No ${PACKAGE_FILE_NAME} found in ${dir}`);
    }

    return project;
}

// Runs a script's shell command line and forwards its exit code.
function runShellCommand(cwd: string, command: string, extraArgs: string[]): never {
    const fullCommand = extraArgs.length > 0 ? `${command} ${extraArgs.join(" ")}` : command;
    const result = spawnSync(fullCommand, { cwd, stdio: "inherit", shell: true });

    if (result.error) {
        if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
            reportError(`Command not found: ${command}`);
        }
        reportError(result.error.message);
    }

    return process.exit(result.status ?? 0) as never;
}

function runScript(dir: string, scriptName: string, extraArgs: string[]): never {
    const project = requireProject(dir);
    const command = project.config.scripts[scriptName];

    if (command === undefined) {
        reportError(`Script "${scriptName}" not found in ${project.packagePath}`);
    }

    return runShellCommand(project.projectDir, command, extraArgs);
}

export function execute() {
    const params = parseArgs(process.argv.slice(2));
    const cwd = process.cwd();

    if (params.options.script !== null) {
        runScript(cwd, params.options.script, params.targets);
        return;
    }

    let fileName: string = params.targets[0];
    let paths: string[] = params.options.path;
    const scriptArgv: string[] = params.targets;

    const project = resolveProjectForTarget(fileName, cwd);

    if (project !== null) {
        paths = [project.modulesDir, ...paths];

        if (fileName !== undefined && isDirectoryTarget(fileName, cwd)) {
            fileName = resolveEntryFile(project);
        }
    }

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
