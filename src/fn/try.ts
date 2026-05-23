// SPDX-License-Identifier: MIT

import { Context } from "../IScript";
import { Base } from "./base";
import { ResolverError } from "../ResolverError";

export default class Component extends Base {
    constructor() { super("try"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        const content = obj.__content__[0];

        if (content === undefined)
            throw new Error(`${this.name()} should have content`);

        try {
            const result = context.resolve(content);

            if (obj.then !== undefined) {
                return context.resolve(obj.then);
            }

            return result;
        } catch (error) {
            if (obj.catch !== undefined) {
                const resolverError = error as ResolverError;

                if (resolverError) {
                    return context.resolve(obj.catch, { value: resolverError.userMessage });
                }

                return context.resolve(obj.catch, { value: (error as Error).message });
            }
        }

        return null;
    }
}