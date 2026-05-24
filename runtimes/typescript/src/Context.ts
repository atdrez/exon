// SPDX-License-Identifier: MIT

import { IResolver } from "./IResolver";
import { RuntimeOptions } from "./RuntimeOptions";
import { IScript, IPropertyScript } from "./IScript"
import { IScriptRepository } from "./IScriptRepository";

type Location = {
    file: string;
    line: number;
};

type KeyValueMap = { [key: string]: any };
type KeyValueSingle = { name: string, value: any };

export class Context {
    public location: Location;

    public readonly options: RuntimeOptions;

    public params(): KeyValueMap | undefined {
        return this.#params;
    }

    public property(): KeyValueSingle | undefined {
        return this.#property;
    }

    #resolver: IResolver;
    #scriptRepository: IScriptRepository;
    #params: KeyValueMap | undefined;
    #property: KeyValueSingle | undefined;

    constructor(resolver: IResolver, scriptRepository: IScriptRepository, options: RuntimeOptions) {
        this.#resolver = resolver;
        this.options = options;
        this.#params = undefined;
        this.#property = undefined;
        this.location = { file: "", line: 0 };
        this.#scriptRepository = scriptRepository;
    }

    public resolve(obj: any, params?: { [key: string]: any }): any {
        if (this.isObjectBinding(obj)) {
            obj = this.resolveBinding(obj['__bind__'], obj['__bindFile__']);
        }

        return this.#resolver!.resolve(obj, params);
    }

    public resolveBinding(path: string, file: string): any {
        return this.#resolver!.resolveBinding(path, file);
    }

    public isObjectBinding(obj: any): boolean {
        return (typeof obj === 'object' && obj !== null && obj['__bind__'] !== undefined);
    }

    public rethrow(error: unknown, location: Location): never {
        return this.#resolver!.rethrow(error, location.file, location.line);
    }

    public findScript(name: string): IScript | undefined {
        return this.#scriptRepository.find(name);
    }

    public registerScript(script: IScript): void {
        this.#scriptRepository.register(script);
    }

    public getScriptRepository(): IScriptRepository {
        return this.#scriptRepository;
    }

    public getProperty(obj: any, key: string): any {
        const property: IPropertyScript = obj[key];

        if (!property || typeof property.getGetter !== 'function')
            return obj[key];

        return this.resolvePropertyScript(property.getGetter(obj), obj, key, obj[key]);
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

        this.#params = params;
        this.#property = undefined;
        return script.resolve(rawObj, this);
    }

    public resolvePropertyScript(script: IScript, obj: any, key: string, value: any): any {
        if (script === undefined)
            throw new Error(`Invalid property script`);

        this.#property = {
            name: key,
            value: value
        }

        return script.resolve(obj, this);
    }
}