'use strict';

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const binDir = path.join(__dirname, '..', 'bin');

function findJsFiles(dir) {
    return fs.readdirSync(dir, { recursive: true })
        .filter((entry) => entry.endsWith('.js'))
        .map((entry) => path.join(dir, entry));
}

esbuild.buildSync({
    entryPoints: findJsFiles(binDir),
    outdir: binDir,
    outbase: binDir,
    allowOverwrite: true,
    bundle: false,
    minify: true,
    sourcemap: true,
    legalComments: 'none',
    format: 'cjs',
    platform: 'node',
    target: 'es2021',
});
