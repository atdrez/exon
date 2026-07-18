// SPDX-License-Identifier: MIT

import { RuntimeOptions } from "./RuntimeOptions";

export interface IResolver {
    resolve(rawObj: any, params?: { [key: string]: any }): any;

    resolveBinding(path: string, file: string): any;

    rethrow(error: unknown, file: string, line: number): never;

    resolveWithOptions(obj: any, opts: RuntimeOptions, params?: { [key: string]: any }): any;

    getCurrentPathStack(): readonly string[];
}