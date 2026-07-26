// SPDX-License-Identifier: MIT

import * as FileSystem from "fs";
import * as Path from "path";
import { IScript } from "./IScript";
import { IScriptRepository } from "./IScriptRepository";

type ExtensionModule = {
    components?(): Array<new () => IScript>;
};

// Lets a search path contribute native components (compiled JS, not declarative .exon)
// without being baked into this package's own fn/index.ts
export function loadNativeExtensions(manager: IScriptRepository, searchPath: string): void {
    const entryPath = Path.resolve(searchPath, "_native", "index.js");

    if (!FileSystem.existsSync(entryPath)) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: ExtensionModule = require(entryPath);

    if (typeof mod.components !== "function") {
        return;
    }

    for (const Ctor of mod.components()) {
        manager.register(new Ctor());
    }
}
