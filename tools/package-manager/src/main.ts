// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";
import * as OS from "os";
import * as ReadLine from "readline";
import { spawnSync } from "child_process";
import { findProject, PACKAGE_FILE_NAME, MODULES_DIR_NAME } from "exon-runtime";

import { addDependencyToConfig, installDependencies, installNodeDependencies, installPackage, uninstallAll, uninstallDependency } from "./PackageInstaller";
import { packProject } from "./PackagePacker";
import { PackagePublisher } from "./PackagePublisher";
import { unpackArchive } from "./PackageUnpacker";
import { fetchAndUnpack } from "./PackageFetcher";
import { AuthClient, decodeSessionTokenClaims } from "./AuthClient";
import { SessionStore } from "./SessionStore";

const USAGE = "Usage: expm install [dir]\n       expm uninstall [name]\n"
    + "       expm pack [dir] [--compress] [--output <dir>]\n"
    + "       expm publish [dir] [--compress] [--registry <url>]\n"
    + "       expm unpack <file.expkg> [folder-path]\n"
    + "       expm fetch <url> [folder-path]\n"
    + "       expm login [--registry <url>]\n"
    + "       expm logout [--registry <url>]";

function extractFlag(args: string[], flag: string): { rest: string[]; present: boolean } {
    return { rest: args.filter((arg) => arg !== flag), present: args.includes(flag) };
}

function extractValueFlag(args: string[], flag: string): { rest: string[]; value: string | undefined } {
    const index = args.indexOf(flag);
    if (index === -1) return { rest: args, value: undefined };
    const value = args[index + 1];
    const rest = args.filter((_, i) => i !== index && i !== index + 1);
    return { rest, value };
}

function reportError(message: string): never {
    console.error("[ERROR]:");
    console.error(message);
    return process.exit(1) as never;
}

function runScript(projectDir: string, scriptName: string, command: string): void {
    console.log(`Running ${scriptName}: ${command}`);

    const result = spawnSync(command, { cwd: projectDir, stdio: "inherit", shell: true });

    if (result.error) {
        reportError(result.error.message);
    }

    if ((result.status ?? 0) !== 0) {
        process.exit(result.status ?? 1);
    }
}

function parsePackageSpec(spec: string): { name: string; version: string } | undefined {
    if (!spec.includes("@"))
        return undefined;

    const atIndex = spec.indexOf("@");
    const name = spec.slice(0, atIndex);
    const version = spec.slice(atIndex + 1);

    if (name.length === 0 || version.length === 0) {
        throw new Error(`Malformed package spec "${spec}": expected name@version`);
    }

    return { name, version };
}

export async function runInstall(args: string[]): Promise<void> {
    const cwd = process.cwd();

    let packageSpec: { name: string; version: string } | undefined;
    try {
        packageSpec = args[0] !== undefined ? parsePackageSpec(args[0]) : undefined;
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
        return;
    }

    if (packageSpec !== undefined) {
        const project = findProject(cwd);
        const modulesDir = project !== null ? project.modulesDir : Path.join(cwd, MODULES_DIR_NAME);

        try {
            await installPackage(packageSpec.name, packageSpec.version, modulesDir);

            if (project !== null) {
                addDependencyToConfig(project.packagePath, packageSpec.name, packageSpec.version);
            }
        } catch (e) {
            reportError(e instanceof Error ? e.message : String(e));
        }
        return;
    }

    const targetDir = args[0] !== undefined ? Path.resolve(cwd, args[0]) : cwd;
    const project = findProject(targetDir);

    if (project === null) {
        reportError(`No ${PACKAGE_FILE_NAME} found in ${targetDir}`);
        return;
    }

    const preinstall = project.config.scripts.preinstall;

    if (preinstall !== undefined) {
        runScript(project.projectDir, "preinstall", preinstall);
    }

    try {
        await installDependencies(project.packagePath, project.config, project.modulesDir);
        installNodeDependencies(project.projectDir, project.config.nodeDependencies);
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
        return;
    }

    const postinstall = project.config.scripts.postinstall;

    if (postinstall !== undefined) {
        runScript(project.projectDir, "postinstall", postinstall);
    }
}

function runUninstall(args: string[]): void {
    const cwd = process.cwd();
    const project = findProject(cwd);

    if (project === null) {
        reportError(`No ${PACKAGE_FILE_NAME} found in ${cwd}`);
        return;
    }

    const name = args[0];

    if (name === undefined) {
        uninstallAll(project.modulesDir);
        return;
    }

    try {
        uninstallDependency(project.config, project.modulesDir, name);
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    }
}

async function runPack(args: string[]): Promise<void> {
    const { rest: rest1, present: compress } = extractFlag(args, "--compress");
    const { rest: rest2, value: outputArg } = extractValueFlag(rest1, "--output");
    const cwd = process.cwd();
    const targetDir = rest2[0] !== undefined ? Path.resolve(cwd, rest2[0]) : cwd;
    const outputDir = outputArg !== undefined ? Path.resolve(cwd, outputArg) : undefined;
    const project = findProject(targetDir);

    if (project === null) {
        reportError(`No ${PACKAGE_FILE_NAME} found in ${targetDir}`);
        return;
    }

    try {
        await packProject(project.projectDir, project.config, undefined, { compress, outputDir });
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    }
}

async function runPublish(args: string[]): Promise<void> {
    const { rest: rest1, present: compress } = extractFlag(args, "--compress");
    const { rest: rest2, value: registry } = extractValueFlag(rest1, "--registry");
    const cwd = process.cwd();
    const targetDir = rest2[0] !== undefined ? Path.resolve(cwd, rest2[0]) : cwd;
    const project = findProject(targetDir);

    if (project === null) {
        reportError(`No ${PACKAGE_FILE_NAME} found in ${targetDir}`);
        return;
    }

    const { name, version, description, license, category, homepage, repository, author, private: isPrivate } = project.config;

    if (name === undefined || version === undefined) {
        reportError(`${PACKAGE_FILE_NAME} must declare "name" and "version" to publish.`);
        return;
    }

    const stagingDir = FileSystem.mkdtempSync(Path.join(OS.tmpdir(), "exon-publish-"));

    try {
        const archivePath = await packProject(project.projectDir, project.config, undefined, { compress, outputDir: stagingDir });
        const publisher = new PackagePublisher({ registry });
        await publisher.publish(archivePath, name, version, { description, license, category, homepage, repository, author, private: isPrivate });
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    } finally {
        FileSystem.rmSync(stagingDir, { recursive: true, force: true });
    }
}

async function runFetch(args: string[]): Promise<void> {
    const cwd = process.cwd();
    const urlArg = args[0];

    if (urlArg === undefined) {
        reportError("Usage: expm fetch <url> [folder-path]");
        return;
    }

    const outputDir = args[1] !== undefined ? Path.resolve(cwd, args[1]) : undefined;

    try {
        await fetchAndUnpack(urlArg, outputDir);
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    }
}

async function runUnpack(args: string[]): Promise<void> {
    const cwd = process.cwd();
    const archiveArg = args[0];

    if (archiveArg === undefined) {
        reportError("Usage: expm unpack <file.expkg> [folder-path]");
        return;
    }

    const archivePath = Path.resolve(cwd, archiveArg);
    const outputDir = args[1] !== undefined ? Path.resolve(cwd, args[1]) : undefined;

    try {
        await unpackArchive(archivePath, outputDir);
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    }
}

function prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = ReadLine.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// No readline equivalent exists for a masked prompt, so raw mode is used directly: input is
// read one character at a time and never echoed, the same way a terminal password prompt (e.g.
// "sudo") behaves, rather than echoing "*" per character and having to handle backspace redraws.
function promptPassword(question: string): Promise<string> {
    return new Promise((resolve, reject) => {
        process.stdout.write(question);

        const stdin = process.stdin;
        const wasRaw = stdin.isRaw;
        let password = "";

        const cleanup = (): void => {
            stdin.removeListener("data", onData);
            if (stdin.isTTY) {
                stdin.setRawMode(Boolean(wasRaw));
            }
            stdin.pause();
        };

        const onData = (chunk: Buffer): void => {
            const char = chunk.toString("utf8");

            if (char === "\n" || char === "\r" || char === "\u0004") {
                cleanup();
                process.stdout.write("\n");
                resolve(password);
                return;
            }

            if (char === "\u0003") {
                cleanup();
                process.stdout.write("\n");
                reject(new Error("Aborted."));
                return;
            }

            if (char === "\u007f" || char === "\b") {
                password = password.slice(0, -1);
                return;
            }

            password += char;
        };

        if (stdin.isTTY) {
            stdin.setRawMode(true);
        }

        stdin.resume();
        stdin.setEncoding("utf8");
        stdin.on("data", onData);
    });
}

export interface Credentials {
    email: string;
    password: string;
}

async function readCredentialsFromTerminal(): Promise<Credentials> {
    const email = await prompt("Email: ");
    const password = await promptPassword("Password: ");
    return { email, password };
}

// readCredentials and sessionStore are overridable so tests can drive this without a real
// terminal or touching the real ~/.exon/auth.json - see PackageInstaller's own token/logger
// parameters for the same trailing-optional-parameter convention used for test injection.
export async function runLogin(
    args: string[],
    readCredentials: () => Promise<Credentials> = readCredentialsFromTerminal,
    sessionStore: SessionStore = new SessionStore()
): Promise<void> {
    const { value: registry } = extractValueFlag(args, "--registry");
    const authClient = new AuthClient(registry);

    const { email, password } = await readCredentials();

    try {
        const result = await authClient.login(email, password);
        const claims = decodeSessionTokenClaims(result.token);

        sessionStore.saveSession(authClient.registry, {
            token: result.token,
            expiresAt: result.expiresAt,
            sessionId: result.sessionId,
            email: claims?.email ?? email,
            username: claims?.username ?? "",
        });

        console.log(`Logged in as ${claims?.username ?? claims?.email ?? email} on ${authClient.registry}.`);
    } catch (e) {
        reportError(e instanceof Error ? e.message : String(e));
    }
}

export async function runLogout(args: string[], sessionStore: SessionStore = new SessionStore()): Promise<void> {
    const { value: registry } = extractValueFlag(args, "--registry");
    const authClient = new AuthClient(registry);

    const session = sessionStore.getSession(authClient.registry);

    if (session === undefined) {
        console.log(`Not logged in on ${authClient.registry}.`);
        return;
    }

    await authClient.logout(session.token);
    sessionStore.clearSession(authClient.registry);
    console.log(`Logged out from ${authClient.registry}.`);
}

export async function execute(): Promise<void> {
    const [command, ...args] = process.argv.slice(2);

    if (command === undefined) {
        reportError(USAGE);
        return;
    }

    if (command === "install") {
        await runInstall(args);
        return;
    }

    if (command === "uninstall") {
        runUninstall(args);
        return;
    }

    if (command === "pack") {
        await runPack(args);
        return;
    }

    if (command === "publish") {
        await runPublish(args);
        return;
    }

    if (command === "unpack") {
        await runUnpack(args);
        return;
    }

    if (command === "fetch") {
        await runFetch(args);
        return;
    }

    if (command === "login") {
        await runLogin(args);
        return;
    }

    if (command === "logout") {
        await runLogout(args);
        return;
    }

    reportError(`Unknown command "${command}"\n${USAGE}`);
}

if (process.argv[1] === __filename) {
    execute();
}
