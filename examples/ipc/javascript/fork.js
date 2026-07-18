'use strict';

const { fork } = require('child_process');
const readline = require('readline');
const path = require('path');

module.exports.isDeferred = function() { return true; }

module.exports.resolve = function(obj, context) {
    const command = context.resolve(obj.command);
    const args = obj.arguments.map(v => context.resolve(v));
    const on = context.resolve(obj.on);

    const child = fork(command, args);
    const input = readline.createInterface({ input: process.stdin, output: process.stdout });

    function prompt() {
        input.question('> ', (line) => {
            if (line.trim() === '/quit') {
                child.kill();
                input.close();
                return;
            }
            const value = Number(line.trim());
            child.send(isNaN(value) ? line.trim() : value);
            prompt();
        });
    }

    child.on('message', (msg) => {
        if (msg && msg.__ready__) {
            on.resolve({ t: 'ready' });
            prompt();
            return;
        }

        on.resolve({ t: 'message', msg });
    });

    child.on('exit', (code) => {
        on.resolve({ t: 'exit', code });
    });

    return null;
}
