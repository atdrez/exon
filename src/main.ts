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

import  * as argv from "argv";
import  * as Native from "./native";
import { Parser } from "./Parser";
import { Resolver } from "./Resolver";
import { ScriptManager } from "./ScriptManager";

const options = [{
    name: 'extended',
    short: 'e',
    type: 'boolean'
}, {
    name: 'path',
    short: 'p',
    type: 'list,path'
}];

const params = argv.option(options).run();

const fileName : string = params.targets[0];
const paths : string[] = params.options.path;
const isExtended: boolean = params.options.extended;

const manager = new ScriptManager();
const components = Native.components();

// register native scripts
for (let i = 0; i < components.length; i++) {
    manager.register(new components[i]);
}

const parser = new Parser(manager, paths);
const result = parser.parse(fileName);

if (isExtended) {
    console.log(JSON.stringify(result, null, 4).replace(/\\\\/g, '\\'));
} else {
    const resolver = new Resolver(manager);
    const output = resolver.resolve(result);

    console.log(JSON.stringify(output, null, 4).replace(/\\\\/g, '\\'));
}

process.exit(0);
