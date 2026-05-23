// SPDX-License-Identifier: MIT

import { OpVariadic } from "./opVariadic";

export default class Component extends OpVariadic {
    constructor() { super("sequence", 1); }

    public evaluate(_obj: any, values: Array<any>): any {
        return values[values.length - 1];
    }
}
