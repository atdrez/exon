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

import { Parser } from "./Parser";
import { Resolver } from "./Resolver";

function usage() {
    console.error("Usage: node %s [--collapsed | --extended] <filename>",
                  process.argv[1]);
    process.exit(-1);
}

if (process.argv.length < 4) {
    usage();
}

const method = process.argv[2];
const fileName = process.argv[3];

const isExtended= (method === "--extended");
const isCollapsed = (method === "--collapsed");

const parser = new Parser();
const result = parser.parse(fileName);

if (isExtended) {
    console.log(JSON.stringify(result, null, 4));
} else if (isCollapsed) {
    const resolver = new Resolver();
    const output = resolver.resolve(result);

    console.log(JSON.stringify(output, null, 4));
} else {
    usage();
}

process.exit(0);
