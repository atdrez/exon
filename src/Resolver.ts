/*
 * Copyright (c) 2017 Adriano Tinoco d'Oliveira Rezende
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
 * KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { Context } from "./IScript";
import { ScriptManager } from "./ScriptManager";

export class Resolver {
    private m_Context: Context;
    private m_ScriptManager: ScriptManager;

    constructor(manager: ScriptManager) {
        this.m_Context = { fileName: "" };
        this.m_ScriptManager = manager;
    }

    public resolve(obj: any) : any {
        let result = {};

        if (obj['__file__'])
            this.m_Context.fileName = obj['__file__'];

        this.resolveRecursive(result, obj);

        let native = obj['__native__'];

        if (!native) {
            const base = obj['__base__'];

            if (base)
                native = base['__native__'];
        }

        if (native !== undefined) {
            const script = this.m_ScriptManager.find(native);

            if (!script)
                throw new Error(`Unable to find '${native}' element`);

            result = script.resolve(result, this.m_Context);
        }

        return result;
    }

    private resolveRecursive(obj: any, source: any) {
        const parent = source['__base__'];

        if (parent) {
            this.resolveRecursive(obj, parent);
        }

        for (const key in source) {
            if (key.startsWith("__")) {
                continue;
            }

            const sourceValue = source[key];

            if (sourceValue === undefined || sourceValue === null) {
                obj[key] = null;
            } else  if (typeof sourceValue === 'object' && sourceValue['__ref__']) {
                for (const innerKey in sourceValue) {
                    if (innerKey.startsWith("__"))
                        continue;

                    obj[key][innerKey] = this.parseValueRecursive(sourceValue[innerKey]);
                }
            } else {
                obj[key] = this.parseValueRecursive(sourceValue);
            }
        }
    }

    private parseValueRecursive(value: any) {
        if (value instanceof Array) {
            const result = new Array<any>();

            for (let key in value) {
                result.push(this.parseValueRecursive(value[key]));
            }

            return result;
        } else if (typeof value === 'object') {
            return this.resolve(value);
        } else {
            return value;
        }
    }
}
