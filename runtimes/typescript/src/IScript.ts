// SPDX-License-Identifier: MIT

import { Context } from "./Context";

export { Context };

export interface IScript {
    name(): string;
    
    resolve(obj: any, context: Context): any;

    // Should return true if execution is deferred
    // and false if it's immediate
    isDeferred?(): boolean;

    // Parser-time hooks (optional).
    // isComponent: return true to store this object as a component definition
    // rather than inline content.
    isComponent?(): boolean;

    // onComponentParsed: called right after the enclosing object is parsed;
    // use `register` to eagerly make a new script available to the parser.
    onComponentParsed?(result: any, dirName: string, register: (script: IScript) => void): void;
}

export interface IPropertyScript extends IScript {
    getGetter(obj: any): IScript;
    getSetter(obj: any): IScript;
}