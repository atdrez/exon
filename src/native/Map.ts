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

import { IScript, Context } from "../IScript";

export class Map implements IScript {
    public name() : string {
        return "Exon.Map";
    }

    public resolve(obj: any, context: Context) : any {
        if (!(obj.keys instanceof Array))
            throw new Error(`${this.name()}.keys: invalid type (array expected)`);

        if (!(obj.values instanceof Array))
            throw new Error(`${this.name()}.values: invalid type (array expected)`);

        if (obj.keys.length !== obj.values.length)
            throw new Error(`${this.name()}.keys and ${this.name()}.values arrays should have the same length`);

        const result = {};

        for (let i = 0; i < obj.keys.length; i++) {
            result[obj.keys[i]] = obj.values[i];
        }

        return result;
    }
}
