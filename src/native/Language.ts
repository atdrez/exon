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

import { IScript } from "../IScript";


export class BaseComponent implements IScript {
    private m_Name: string;

    public name() : string {
        return this.m_Name;
    }

    constructor(name: string) {
        this.m_Name = `Exon.${name}`;
    }

    public resolve(obj: any) : any {
        throw new Error(`Not implemented`);
    }
}

export class BinaryOperator extends BaseComponent {
    public resolve(obj: any) : any {
        if (obj.left === undefined)
            throw new Error(`${this.name()} should have a 'left' property defined`);

        if (obj.right === undefined)
            throw new Error(`${this.name()} should have a 'right' property defined`);

        return this.evaluate(obj.left, obj.right);
    }

    protected evaluate(left: any, right: any) : boolean {
        throw new Error(`Not implemented`);
    }
}

export class BaseComparator extends BaseComponent {
    public resolve(obj: any) : any {
        const values = obj.condition;

        if (values === undefined)
            throw new Error(`${this.name()} should have a 'condition' property defined`);

        if (!(values instanceof Array) || values.length < 2)
            throw new Error(`${this.name()} 'condition' property should be an array with at least 2 elements`);

        return this.evaluate(values);
    }

    protected evaluate(values: Array<any>) : boolean {
        throw new Error(`Not implemented`);
    }
}


export class Eq extends BinaryOperator {
    constructor() {
        super("Eq");
    }

    public evaluate(left: any, right: any) : boolean {
        return (left === right);
    }
}

export class Ne extends BinaryOperator {
    constructor() {
        super("Ne");
    }

    public evaluate(left: any, right: any) : boolean {
        return (left !== right);
    }
}

export class Or extends BaseComparator {
    constructor() {
        super("Or");
    }

    public evaluate(values: Array<any>) : boolean {
        let result = values[0];

        for (let i = 1; i < values.length; i++) {
            result = result || values[i];
        }

        return result;
    }
}

export class And extends BaseComparator {
    constructor() {
        super("And");
    }

    public evaluate(values: Array<any>) : boolean {
        let result = values[0];

        for (let i = 1; i < values.length; i++) {
            result = result && values[i];
        }

        return result;
    }
}

export class If extends BaseComponent {
    constructor() {
        super("If");
    }

    public resolve(obj: any) : any {
        if (obj.condition === undefined)
            throw new Error(`${this.name()} should have a 'condition' property defined`);

        if (obj.then === undefined)
            throw new Error(`${this.name()} should have a 'then' property defined`);

        if (obj.condition)
            return obj.then;
        else if (obj.else !== undefined)
            return obj.else;
        else
            return null;
    }
}
