// SPDX-License-Identifier: MIT

import { IScript } from "./IScript";
import { IScriptRepository } from "./IScriptRepository";

export class ScriptRepository implements IScriptRepository {
    #factories: Map<string, IScript> = new Map<string, IScript>();

    public contains(name: string) : boolean {
        return this.#factories.get(name) !== undefined;
    }

    public register(obj: IScript) : void {
        this.#factories.set(obj.name(), obj);
    }

    public find(name: string) : IScript | undefined{
        return this.#factories.get(name);
    }
}
