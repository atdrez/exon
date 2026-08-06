// SPDX-License-Identifier: MIT

import * as Path from "path";

export class PathResolver {
    public static readonly extension = ".exon";

    public static resolveDottedPath(objectName: string, dirName: string): string {
        let resolvedDir = dirName;
        let name = objectName;

        if (name.startsWith('..')) {
            let dotCount = 0;
            while (dotCount < name.length && name[dotCount] === '.')
                dotCount++;
            const levelsUp = dotCount - 1;
            for (let i = 0; i < levelsUp; i++) {
                resolvedDir = Path.dirname(resolvedDir);
            }
            name = name.slice(dotCount);
        }

        const basePath = name.split(".").join("/");
        return Path.join(resolvedDir, basePath + PathResolver.extension);
    }
}
