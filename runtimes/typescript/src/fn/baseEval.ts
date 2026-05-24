// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export class BaseEval extends Base {
    public resolve(obj: any, _context: Context) : any {
        if (typeof obj.content !== "string")
            throw new Error(`${this.name()}.content: invalid type (expected string)`);

        let result = obj.content;

        for (const attribute in obj) {
            if (attribute === 'content')
                continue;

            let value = obj[attribute];

            if (this.shouldWrapString() && (typeof value === "string"))
                value = `"${value}"`;

            if (value instanceof Object)
                value = JSON.stringify(value);

            result = result.replace(new RegExp("\\$" + attribute, 'g'), () => value);
        }

        try {
            return this.evaluateContent(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`${this.name()}.content: evaluation failed - ${message}\n${result}`);
        }
    }

    protected shouldWrapString() : boolean {
        return true;
    }

    protected evaluateContent(content: any) : any {
        return new Function(content)();
    }
}
