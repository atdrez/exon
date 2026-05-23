// SPDX-License-Identifier: MIT

import { Base } from "./base";
import { Context } from "../IScript";

export default class Component extends Base {
    constructor() { super("while"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        if (obj.condition === undefined)
            throw new Error(`${this.name()}.condition property is invalid`);

        if (obj.do === undefined)
            throw new Error(`${this.name()}.do property is invalid`);

        if (!(obj.condition instanceof Object))
            throw new Error(`${this.name()}.condition should be an object`);

        const params: any = obj.params;

        if (params !== undefined && !(params instanceof Object))
            throw new Error(`${this.name()}.params should be an object`);

        const result: any[] = [];
        const includeNull = (obj.includeNull === true);

        while (true) {
            const condition = context.resolve(obj.condition, params);

            if (!condition)
                break;

            const response = context.resolve(obj.do, params);

            if (includeNull || (response !== null && response !== undefined)) {
                result.push(response);
            }
        }

        return result;
    }
}
