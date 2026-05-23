// SPDX-License-Identifier: MIT

export interface IResolver {
    resolve(rawObj: any, params?: { [key: string]: any }): any;

    resolveBinding(path: string, file: string): any;

    rethrow(error: unknown, file: string, line: number): never;
}