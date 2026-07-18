# Automation using IPC

This lets a parent process spawn an Exon worker, send it commands, and
receive structured results, without requiring any shared code or protocol library.

## Overview

The IPC model is simple:
1. A parent process spawns `node bin/main.js worker.exon` as a child.
2. The parent writes a message to the child's stdin.
3. The child reads the message, processes it, and sends a response.
4. The parent reads the response from the child's stdout.

## Worker Example

<!--#exon-->
<!-- ..data.markdown.example { "ipc/worker" } -->
```js
***
IPC worker - receives a command string from the parent process,
computes the result, and sends it back.

Run via parent.js (do not run directly):
  node examples/ipc/parent.js
***

using fn.*

fn.sequence {
    fn.native { id: "ipc.channel" path: "javascript/channel.js" }
    fn.native { id: "lib.fetch" path: "javascript/fetch_url.js" }

    ipc.channel {
        content: sequence@self {
            input: parameter { "message" }

            _checkMessage: if {
                condition: not { string.is { @self.input } }
                then: raise { "invalid message" }
            }

            arguments: string.split { @self.input separator: " " }
            command: get { target: @self.arguments index: 0 }
            param: get { target: @self.arguments index: 1 }

            if {
                condition: not {
                    and {
                        string.is { @self.command }
                        string.is { @self.param }
                    }
                }
                then: raise { "invalid parameters" }
            }

            switch {
                value: @self.command

                "fetch"  { input: @self.input result: lib.fetch { url: @self.param } }
                "square" { input: @self.input result: mul { @self.param @self.param } }

                raise { "invalid command received" }
            }
        }
    }
}

```
<!--#endexon-->

## Parent Process

<!--#exon-->
<!-- ..data.markdown.example { "ipc/parent" } -->
```js
***
IPC parent - forks the worker and drives interactive input.

Run with:
  ./ts-run.sh examples/ipc/parent.exon

Commands:
  fetch <url>
  square <number>
  /quit
***

using fn.*

sequence {
    native { id: "lib.fork" path: "javascript/fork.js" }

    lib.fork@self {
        command: path.absolute{"../../runtimes/typescript/bin/main.js"}
        arguments: [ path.absolute{"worker.exon"} ]

        on: closure {
          sequence@event {
              t: parameter { "t" }
              msg: parameter { "msg" }
              code: parameter { "code" }

              display: closure {
                println{ "[worker]: " parameter{"message"} }
              }

              cond {
                  eq { @event.t "ready" }
                  println { "[parent] Worker ready. Type /quit to exit." }

                  eq { @event.t "message" }
                  call { @event.display  message: json.encode { @event.msg } }

                  eq { @event.t "exit" }
                  sequence {
                      println { "[parent] Worker exited (code " @event.code ")" }
                      process.exit { 0 }
                  }
              }
          }
        }
    }
}

```
<!--#endexon-->