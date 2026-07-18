// SPDX-License-Identifier: MIT

import { Context } from "../IScript";
import { ComponentBase } from "./componentBase";

export default class Component extends ComponentBase {
    constructor() { super("component"); }

    public resolve(obj: any, context: Context): any {
        if (typeof obj.id !== "string")
            throw new Error(`${this.name()}.id: invalid type (expected string)`);

        if (typeof obj.content !== "object" || obj.content === null)
            throw new Error(`${this.name()}.content: invalid type (expected object)`);

        Component.registerSelf(obj.id, obj.content, obj.content.__file__ ?? "", context);
        return null;
    }
}