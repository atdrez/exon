// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";
import { Resolver } from "../../Resolver";
import { RuntimeOptions } from "../../RuntimeOptions";
import { IScriptRepository } from "../../IScriptRepository";

export class Closure {
    readonly #ast: any;
    readonly #file: string;
    readonly #line: number;
    readonly #scope: Record<string, any>;
    readonly #manager: IScriptRepository;
    readonly #options: RuntimeOptions;

    constructor(ast: any, scope: Record<string, any>, file: string, line: number,
        manager: IScriptRepository, options: RuntimeOptions) {
        this.#ast = ast;
        this.#file = file;
        this.#line = line;
        this.#scope = scope;
        this.#manager = manager;
        this.#options = options;
    }

    public resolve(params?: Record<string, any>): any {
        const resolver = new Resolver(this.#manager, this.#options);

        for (const [key, value] of Object.entries(this.#scope)) {
            resolver.registerBinding(key, this.#file, value);
        }

        resolver.registerBinding('root', this.#file, this);

        const ast = {
            __file__: this.#file,
            __line__: this.#line,
            fn: this.#ast
        };

        return resolver.resolve(ast, params).fn;
    }
}

export default class Component extends Base {
    constructor() { super("closure"); }

    public isDeferred(): boolean {
        return true;
    }

    public resolve(obj: any, context: Context): any {
        const content = obj.__content__

        if (!(content instanceof Array) || content.length !== 1)
            throw new Error(`${this.name()} invalid arguments (expected 1 param)`);

        const closureAst = content[0];

        if (typeof closureAst !== "object" || (closureAst instanceof Array))
            throw new Error(`${this.name()} invalid content`);

        const options = new RuntimeOptions({
            run: context.options.runMode,
            test: context.options.testMode,
            namedArgv: context.options.namedArgv,
        }, context.options.argv);

        const resolvedScope : Record<string, any> = {};

        for (const key of Object.keys(obj)) {
            if (key.startsWith("__"))
                continue;

            const value = obj[key];
            resolvedScope[key] = context.isObjectBinding(value)
                ? context.resolveBinding(value['__bind__'], value['__bindFile__'] ?? '')
                : context.resolve(value);
        }

        return new Closure(closureAst, resolvedScope,
            obj['__file__'] ?? '', obj['__line__'], context.getScriptRepository(), options);
    }
}
