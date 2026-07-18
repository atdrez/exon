'use strict';

const { fork } = require('child_process');
const readline = require('readline');
const path = require('path');

module.exports.isDeferred = function() { return true; }

module.exports.resolve = function(obj, context) {
    const mainJs = process.argv[1];
    const dirName = path.dirname(context.location.file);
    const workerPath = path.resolve(dirName, obj.worker);

    const child = fork(mainJs, [workerPath]);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    function prompt() {
        rl.question('> ', (line) => {
            if (line.trim() === '/quit') {
                console.log('[parent] Shutting down worker.');
                child.kill();
                rl.close();
                return;
            }
            const value = Number(line.trim());
            child.send(isNaN(value) ? line.trim() : value);
            prompt();
        });
    }

    child.on('message', (msg) => {
        if (msg && msg.__ready__) {
            console.log('[parent] Worker ready. Type /quit to exit.');
            prompt();
            return;
        }
        if (msg && msg.__error__) {
            console.error('[parent] Worker error:', msg.__error__);
        } else {
            console.log('[parent] Response:', JSON.stringify(msg));
        }
    });

    child.on('exit', (code) => {
        console.log(`[parent] Worker exited (code ${code})`);
        process.exit(0);
    });

    return null;
}
