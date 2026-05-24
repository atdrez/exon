// SPDX-License-Identifier: MIT
// Demonstrates bidirectional IPC with an exon worker.
// Run with: node samples/ipc/parent.js

const { fork } = require('child_process');
const path = require('path');
const readline = require('readline');

const mainJs = path.join(__dirname, '../../runtimes/typescript/bin/main.js');
const workerExon = path.join(__dirname, 'worker.exon');

const child = fork(mainJs, [workerExon, '-c']);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("commands available:");
console.log("  fetch <url>");
console.log("  square <number>");
console.log("\n");

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
        console.log('[parent] Worker ready. Type a number and press Enter. Type /quit to exit.');
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
