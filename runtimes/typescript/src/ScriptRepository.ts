// SPDX-License-Identifier: MIT

import { IScript } from "./IScript";
import { IScriptRepository } from "./IScriptRepository";

export class ScriptRepository implements IScriptRepository {
    private _factories: Map<string, IScript> = new Map<string, IScript>();

    public contains(name: string) : boolean {
        return this._factories.get(name) !== undefined;
    }

    public register(obj: IScript) : void {
        this._factories.set(obj.name(), obj);
    }

    public find(name: string) : IScript | undefined{
        return this._factories.get(name);
    }
}
