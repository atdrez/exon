// SPDX-License-Identifier: MIT

export { Parser } from "./Parser";
export { Resolver } from "./Resolver";
export { PathResolver } from "./PathResolver";
export { IScript, IPropertyScript } from "./IScript";
export { Context, Location } from "./Context";
export { IScriptRepository } from "./IScriptRepository";
export { ScriptRepository } from "./ScriptRepository";
export { RuntimeOptions } from "./RuntimeOptions";
export { CallSite, LocatedError, ResolverError } from "./ResolverError";
export { Closure } from "./fn/lang/closure";
export { loadNativeExtensions } from "./NativeExtensionLoader";
export { loadPackageConfig, PackageConfig, PackageDependency, DEFAULT_ENTRY_FILE } from "./PackageConfig";
export {
    findProject,
    resolveProjectForTarget,
    resolveEntryFile,
    isDirectoryTarget,
    ExonProject,
    PACKAGE_FILE_NAME,
    MODULES_DIR_NAME,
} from "./Project";
export * as Native from "./fn";
