import { EnvVar } from "./EnvVar";
import { Eq, Ne, Or, And, If } from "./Language";

export function components() : any {
    return [ EnvVar, Eq, Ne, Or, And, If ];
}
