// SPDX-License-Identifier: MIT

import { IResolver } from "./IResolver";
import { RuntimeOptions } from "./RuntimeOptions";
import { IScript, IPropertyScript } from "./IScript"
import { IScriptRepository } from "./IScriptRepository";

export type Location = {
    file: string;
    line: number;
};

type KeyValueMap = { [key: string]: any };
type KeyValueSingle = { name: string, value: any };

type ResolverScope = {
    route?: string[],
    args?: Record<string, string>
};

export class Context {
    private _resolver: IResolver;
    private _scriptRepository: IScriptRepository;
    private _params: KeyValueMap | undefined;
    private _property: KeyValueSingle | undefined;

    public location: Location;

    public readonly options: RuntimeOptions;

    public params(): KeyValueMap | undefined {
        return this._params;
    }

    public property(): KeyValueSingle | undefined {
        return this._property;
    }

    constructor(resolver: IResolver, scriptRepository: IScriptRepository, options: RuntimeOptions) {
        this._resolver = resolver;
        this.options = options;
        this._params = undefined;
        this._property = undefined;
        this.location = { file: "", line: 0 };
        this._scriptRepository = scriptRepository;
    }

    public resolve(obj: any, params?: { [key: string]: any }, scope?: ResolverScope): any {
        if (scope !== undefined) {
            const route = scope.route;
            const namedArgv = scope.args;
            const options = new RuntimeOptions({ route, namedArgv });
            return this._resolver.resolveWithOptions(obj, options, params);
        }
    
        if (this.isObjectBinding(obj)) {
            obj = this.resolveBinding(obj['__bind__'], obj['__bindFile__']);
        }

        return this._resolver!.resolve(obj, params);
    }

    public resolveBinding(path: string, file: string): any {
        return this._resolver!.resolveBinding(path, file);
    }

    public isObjectBinding(obj: any): boolean {
        return (typeof obj === 'object' && obj !== null && obj['__bind__'] !== undefined);
    }

    public rethrow(error: unknown, location: Location): never {
        return this._resolver!.rethrow(error, location.file, location.line);
    }

    public findScript(name: string): IScript | undefined {
        return this._scriptRepository.find(name);
    }

    public registerScript(script: IScript): void {
        this._scriptRepository.register(script);
    }

    public getScriptRepository(): IScriptRepository {
        return this._scriptRepository;
    }

    public pathStack(): string[] {
        return [...this._resolver.getCurrentPathStack()];
    }

    public getProperty(obj: any, key: string): any {
        const property: IPropertyScript = obj[key];

        if (!property || typeof property.getGetter !== 'function')
            return property;

        return this.resolvePropertyScript(property.getGetter(obj), obj, key, property);
    }

    public setProperty(obj: any, key: string, value: any): void {
        const property: IPropertyScript = obj[key];

        if (!property || typeof property.getSetter !== 'function') {
            obj[key] = value;
            return;
        }

        this.resolvePropertyScript(property.getSetter(obj), obj, key, value);
    }

    public resolveScript(script: IScript, rawObj: any, params?: { [key: string]: any }): any {
        if (script === undefined)
            throw new Error(`Invalid property script`);

        this._params = params;
        this._property = undefined;
        return script.resolve(rawObj, this);
    }

    public resolvePropertyScript(script: IScript, obj: any, key: string, value: any): any {
        if (script === undefined)
            throw new Error(`Invalid property script`);

        this._property = {
            name: key,
            value: value
        }

        return script.resolve(obj, this);
    }
}