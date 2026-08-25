// SPDX-License-Identifier: MIT

import { Base } from "../base";
import { Context } from "../../IScript";
import { Location } from "../../Context";
import { Resolver } from "../../Resolver";
import { RuntimeOptions } from "../../RuntimeOptions";
import { IScriptRepository } from "../../IScriptRepository";

export class Closure {
    private readonly _ast: any;
    private readonly _file: string;
    private readonly _line: number;
    private readonly _scope: Record<string, any>;
    private readonly _manager: IScriptRepository;
    private readonly _options: RuntimeOptions;
    private readonly _location: { file: string, line: number };
    private readonly _scopedAst: { __file__: string, __line__: number, fn: any };

    constructor(ast: any, scope: Record<string, any>, file: string, line: number,
        manager: IScriptRepository, options: RuntimeOptions) {
        this._ast = ast;
        this._file = file;
        this._line = line;
        this._scope = scope;
        this._manager = manager;
        this._options = options;
        this._location = { file, line };
        this._scopedAst = { __file__: file, __line__: line, fn: ast };
    }

    public get location(): Location {
        return this._location;
    }

    public resolve(params?: Record<string, any>): any {
        const resolver = new Resolver(this._manager, this._options);

        for (const [key, value] of Object.entries(this._scope)) {
            resolver.registerBinding(key, this._file, value);
        }

        resolver.registerBinding('root', this._file, this);
        return resolver.resolve(this._scopedAst, params).fn;
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
