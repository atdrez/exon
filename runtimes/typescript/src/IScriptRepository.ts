// SPDX-License-Identifier: MIT

import { IScript } from "./IScript";

export interface IScriptRepository {
    contains(name: string) : boolean;

    register(obj: IScript) : void;

    find(name: string): IScript | undefined;
}
