// SPDX-License-Identifier: MIT

export type ParsedArgs = {
    options: {
        extended: boolean;
        path: string[];
        test: boolean;
        run: boolean;
        channel: boolean;
        bare: boolean;
    };
    targets: string[];
};

export function parseArgs(raw: string[]): ParsedArgs {
    const opts: ParsedArgs["options"] = {
        extended: false,
        path: [],
        test: false,
        run: false,
        channel: false,
        bare: false,
    };

    let i = 0;
    while (i < raw.length) {
        const arg = raw[i];
        if (arg === "-e" || arg === "--extended") {
            opts.extended = true;
            i++;
        } else if (arg === "-t" || arg === "--test") {
            opts.test = true;
            i++;
        } else if (arg === "-r" || arg === "--run") {
            opts.run = true;
            i++;
        } else if (arg === "-c" || arg === "--channel") {
            opts.channel = true;
            i++;
        } else if (arg === "-b" || arg === "--bare") {
            opts.bare = true;
            i++;
        } else if (arg === "-p" || arg === "--path") {
            i++;
            if (i < raw.length) {
                opts.path.push(raw[i]);
                i++;
            }
        } else {
            break;
        }
    }

    return { options: opts, targets: raw.slice(i) };
}
