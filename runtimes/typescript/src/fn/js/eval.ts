// SPDX-License-Identifier: MIT

import { BaseEval } from "../baseEval";

export default class Component extends BaseEval {
    #cache: Map<string, () => any> = new Map();

    constructor() { super("js.eval"); }

    protected evaluateContent(content: string) : any {
        let fn = this.#cache.get(content);

        if (fn === undefined) {
            fn = new Function(content) as () => any;
            this.#cache.set(content, fn);
        }

        return fn();
    }
}
