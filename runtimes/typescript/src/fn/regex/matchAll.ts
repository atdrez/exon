// SPDX-License-Identifier: MIT

import { Context } from "../../IScript";
import { OpUnary } from "../opUnary";

export default class Component extends OpUnary {
    constructor() { super("regex.matchAll"); }

    public evaluate(obj: any, value: any, _context: Context): any {
        if (typeof value !== "string")
            throw new Error(`${this.name()} expected string argument`);

        if (typeof obj.pattern !== "string")
            throw new Error(`${this.name()}.pattern should be string`);

        const flags = typeof obj.flags === "string" ? obj.flags : "";
        const globalFlags = flags.includes("g") ? flags : `${flags}g`;
        const matches = value.matchAll(new RegExp(obj.pattern, globalFlags));

        return Array.from(matches).map((result) => ({
            value: result[0],
            index: result.index,
            groups: Array.from(result).slice(1).map((group) => group === undefined ? null : group),
            named: result.groups ? { ...result.groups } : {}
        }));
    }
}
