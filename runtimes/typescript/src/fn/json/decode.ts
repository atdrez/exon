// SPDX-License-Identifier: MIT

import { BaseEval } from "../baseEval";

export default class Component extends BaseEval {
    constructor() { super("json.decode"); }

    protected shouldWrapString() : boolean {
        return false;
    }

    protected evaluateContent(content: any) : any {
        return JSON.parse(content);
    }
}
