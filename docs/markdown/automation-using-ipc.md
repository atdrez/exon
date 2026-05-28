# Automation using IPC

Exon supports inter-process communication through `ipc.getmessage` and `ipc.sendmessage`.
This lets a parent process (in any language) spawn an Exon worker, send it commands, and
receive structured results, without requiring any shared code or protocol library.

## Overview

The IPC model is simple:
1. A parent process spawns `node bin/main.js worker.exon` as a child.
2. The parent writes a message to the child's stdin.
3. The child reads the message with `ipc.getmessage`, processes it, and sends a response
   with `ipc.sendmessage`.
4. The parent reads the response from the child's stdout.

## Worker Example

<!--#exon-->
<!-- ..data.markdown.example { "ipc/worker" } -->
```js
***
IPC worker - receives a number from the parent process,
computes its square, and sends the result back.

Run via parent.js (do not run directly):
  node examples/ipc/parent.js
***

using fn.*

{
    fn.native {
        id: "lib.fetch"
        path: "js/fetch_url.js"
    }

    input: ipc.getmessage {}

    try {
        sequence@self {
            _checkMessage: if {
                condition: not { string.is { @root.input } }
                then: raise { "invalid message" }
            }

            arguments: string.split { @root.input separator: " " }

            // expect to receive cmd followed by param
            command: get { target: @self.arguments index: 0 }
            parameter: get { target: @self.arguments index: 1 }

            if {
                condition: not {
                    and {
                        string.is { @self.command }
                        string.is { @self.parameter }
                    }
                }
                then: raise { "invalid parameters" }
            }

            switch {
                value: @self.command

                fetch: ipc.sendmessage {
                    {
                        input: @root.input
                        result: lib.fetch { url: @self.parameter }
                    }
                }

                square: ipc.sendmessage {
                    { input: @root.input result: mul { @self.parameter @self.parameter } }
                }

                __default: raise { "invalid command received" }
            }
        }
        catch: sequence@error {
            value: parameter{}
            ipc.sendmessage {
                {
                    input: @root.input
                    result: string.join { "error: " @error.value }
                }
            }
        }
    }
}

```
<!--#endexon-->

## Parent Process (Node.js)

<!--#exon-->
<!-- ..data.markdown.example { "ipc/parent" format: "js" extension: "js"} -->
```js
// Demonstrates bidirectional IPC with an exon worker.
// Run with: node examples/ipc/parent.js

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

```
<!--#endexon-->


## Message Format

Messages sent to the worker are plain text (one per line by default). The worker parses
them using string and logic components. Responses sent with `ipc.sendmessage` are
serialized to JSON automatically.

## Persistent Workers

A worker that needs to handle multiple requests in a loop can use `while`:

```
using fn.*

{
    running: true

    _loop: while {
        condition: @root.running
        do: sequence {
            msg: ipc.getmessage {}
            ipc.sendmessage {
                { echo: @root.msg }
            }
        }
    }
}
```