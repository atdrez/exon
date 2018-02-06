import { Map } from "./Map";
import { Json } from "./Json";
import { EvalJson } from "./EvalJson";
import { Merge } from "./Merge";
import { EnvVar } from "./EnvVar";
import { Eq, Ne, Or, And, If } from "./Language";

export function components() : any {
    return [ Map, Json, EvalJson, Merge, EnvVar, Eq, Ne, Or, And, If ];
}
