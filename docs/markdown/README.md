<!--#exon-->
<!-- fn.string.join { "# " ..data.html.field { key: "title" } } -->
# The Exon Language
<!--#endexon-->

<!--#exon-->
<!-- ..data.html.field { key: "description" } -->
Exon files define structured object graphs. <strong>Inheritance</strong>
lets child files override any property from a base type without duplicating the rest.
<strong>Bindings</strong> reference computed values by name across the same file.
<strong>Components</strong> handle arithmetic, flow control, error handling, string
manipulation, document transformations, or anything a component produces.
<strong>Properties</strong> enforce type constraints, value ranges, and business
rules at the field level through getter/setter pairs, self-validating data with
no external schema language required. Add your own components in JavaScript and
they slot in identically to the standard library.
<!--#endexon-->

## Quick Look

<!--#exon-->
<!-- ..data.markdown.snippet { "quick-look" } -->
```js
using fn.*
using fn.process.env

{
    host: "localhost"
    port: coalesce { env { "PORT" } 8080 }
    debug: false
    version: 1.04
    validated: null
    tags: [ "dev", "internal" ]
    versionedTags: foreach {
        data: @root.tags
        do: string.join { parameter{"value"} ":" @root.version }
    }
}
```
<!--#endexon-->

Generated output setting $PORT = 30:

<!--#exon-->
<!-- ..data.markdown.snippet { "quick-look" format: "json" extension: "json" } -->
```json
{
    "host": "localhost",
    "port": 30,
    "debug": false,
    "version": 1.04,
    "validated": null,
    "tags": [
        "dev",
        "internal"
    ],
    "versionedTags": [
        "dev:1.04",
        "internal:1.04"
    ]
}
```
<!--#endexon-->

Running `node bin/main.js hello.exon` prints the JSON representation directly.

## Key Features

<!--#exon-->
<!--
fn.sequence {
    body: ..data.content {}
    fn.string.join {
        separator: "\n"
        fn.foreach {
            data: @root.body.features
            do: fn.sequence@entry {
                v: fn.parameter{"value"}
                fn.string.join {
                    "- " "**" @entry.v.name "**: " @entry.v.description
                }
            }
        }
    }
}
-->
- **Inheritance**: Base types let you share and override configuration across environments with zero duplication.
- **Multi-format output**: Encode the same object to JSON, YAML, XML, or plist by swapping a single wrapper.
- **Computed values**: Built-in arithmetic, string operations, flow control, and environment variable access.
- **Extensible**: Add custom components as plain JavaScript modules. No recompile required.
- **File splitting**: Dot-notation type names map to file paths, enabling clean modular configurations.
- **Bindings**: Reference any property anywhere with <code>@</code>bindings, resolved lazily at runtime.
<!--#endexon-->

## Core Principles

Exon is built around a small number of foundational ideas. Understanding them
explains the design decisions behind the language and the trade-offs that were
deliberately made.

<!--#exon-->
<!--
fn.sequence {
    body: ..data.content {}
    fn.string.join {
        separator: "\n"
        fn.foreach {
            data: @root.body.principles
            do: fn.sequence@entry {
                v: fn.parameter{"value"}
                fn.string.join {
                    "- " "**" @entry.v.key "**: " @entry.v.value
                }
            }
        }
    }
}
-->
- **Simplicity**: The language reduces to a single concept: a named object block with key-value properties. There are no special syntax forms for operators, loops, or functions. Every construct, from arithmetic to file I/O, is expressed as a named object call. This uniformity makes Exon fast to learn, predictable to read, and straightforward to extend without touching the grammar.
- **Extensibility**: The language specification deliberately omits arithmetic, logic, flow control, and I/O. These capabilities are implemented as components (pluggable objects that the resolver dispatches to at runtime). A standard library ships with over 90 components covering math, strings, collections, serialization, and process interaction. You can add your own in JavaScript or TypeScript without modifying the runtime.
- **Easy to Port**: The interpreter is a small tree-walking resolver with no bytecode compiler, no JIT, and no built-in type system. The entire pipeline is: lexer, parser, and resolver with a component registry. Porting Exon to a new host language requires implementing this pipeline over a map/array data model, nothing more.
- **Multipurpose**: Because Exon has no built-in semantics beyond object resolution, the same syntax can power configuration management, document generation, build pipelines, GUI layout, CSS authoring, automation scripting, or any domain-specific language you need. Swap the component library and the language speaks a different domain, with no changes to the parser or resolver.
- **Type Agnostic**: The language works over four primitive constructs (strings, numbers, booleans, and null) plus arrays and generic objects. There are no built-in named types, classes, or schemas in the language core. Complex types emerge by composing existing components or writing native ones, keeping the specification minimal and the type model fully open-ended.
- **Type and Data Constraints**: Exon's property system turns plain fields into active validators. A property object defines <code>get</code> and <code>set</code> handlers that execute on every read and write. This lets you enforce type constraints, value ranges, format rules, and business logic at the field level, without scattering validation code through calling logic. The result is self-validating data structures with no external schema language required.
<!--#endexon-->

## Use Cases

Because Exon separates syntax from semantics, the same language adapts to a wide range of domains simply by swapping the component library. The examples below illustrate three common applications: scripting and build tooling, declarative GUI layout, and multi-format document generation.

### Scripting & Tooling

Exon can be used for tooling, configuration process, orchestrating build pipelines, generating gui layouts, and other tasks.
<!--#exon-->
<!-- ..data.markdown.snippet { "tooling" } -->
```js
*** Example of C a project meta build system ***

using fn.*
{
    component {
        id: "find_files"
        content: wrapper {
            dir: ""
            path: ""
            content: string.split {
                string.trim {
                    process.exec { "find " @root.dir " -name '" @root.path "' | sort" }
                }
                separator: "\n"
            }
        }
    }

    component {
        id: "build_command"
        content: wrapper {
            files: []; includes: [];
            target: ""; outputDir: "";

            content: string.join@do {
                or { process.env { "EMAKE_C_COMPILER" } "gcc" }
                " -o " @root.outputDir "/" @root.target
                string.join {
                    foreach {
                        data: @root.includes
                        do: string.join { " -I " parameter {"value"} " " }
                    }
                    separator: " "
                }
                string.join { @root.files separator: " " }
            }
        }
    }

    assert {
      defined { process.argv{0} }
      message: "Script argument is missing"
    }

    dir: path.dirname { process.argv{0} }
    srcDir: string.join { @root.dir "/src" }
    outDir: string.join { @root.dir "/bin" }

    // create build command
    cmd: build_command {
        outputDir: @root.outDir
        includes: [ @root.srcDir ]
        target: or { process.argv{1} "hello" }
        files: find_files { dir: @root.srcDir path: "*.c" }
    }

    // make output directory & compile
    process.exec { "mkdir -p " @root.outDir ";" @root.cmd }
}
```
<!--#endexon-->

### GUI layout generator

A Tk/Ttk widget hierarchy structured object graph that generates the corresponding Python code. Each widget type maps to a component; properties such as <code>text</code>, <code>width</code>, and <code>command</code> become named fields. The generated Python file wires up the widget tree and emits stub callback handlers for every bound event, ready to be filled in with application logic.

<!--#exon-->
<!-- ..data.markdown.example { "gui/top_frame" } -->
```js
using fn.*
using lib.ttk.*

Class {
    ref: "self"
    name: "TopFrameBase"
    parent_class: "ttk.Frame"

    // create label
    Label {
        ref: "label"
        text: "Your name:"
        layout: { anchor: "w" }
    }

    // create text input
    Entry {
        ref: "name_entry"
        owner: @root.ref
        layout: { fill: "x" pady: 5 }
    }

    // create button
    Button {
        ref: "btn"
        text: "Say Hello"
        layout: { pady: 5 }

        // bind click to method
        command: lib.py.lambda {
            target: @root.ref
            method: @root._say_hello.ref
        }
    }

    _say_hello: lib.py.def { ref: "_say_hello" }

    // methods to be overriden
    methods: [ @root._say_hello ]
}
```
<!--#endexon-->

### Multi-Format Document Generation

Define your data structure once and produce JSON, YAML, PLIST, XML, or any custom format by using object wrappers.

<!--#exon-->
<!-- ..data.markdown.snippet { "doc-gen" } -->
```js
using fn.*

sequence {
    content: {
        name: "app"
        config: {
            host: "localhost"
            port: 8080
        }
    }

    // get first argument, or fallback to 'json'
    format: or { process.argv{1} "json"}

    cond {
        // output yaml
        eq {@root.format "yaml"} fn.yaml.encode { @root.content }

        // output xml
        eq {@root.format "xml"} fn.xml.encode { @root.content }

        // output plist
        eq {@root.format "plist"} fn.plist.encode { @root.content }

        // output json
        eq {@root.format "json"} fn.json.encode { @root.content }
    }
}
```
<!--#endexon-->

## Guides

- [Getting Started](docs/markdown/getting-started.md)
- [Basics](docs/markdown/basics.md)
- [Inheritance](docs/markdown/inheritance.md)
- [Bindings](docs/markdown/bindings.md)
- [Math and Logic](docs/markdown/math-and-logic.md)
- [Flow Control](docs/markdown/flow-control.md)
- [Property Feature](docs/markdown/property-feature.md)
- [Testing](docs/markdown/testing.md)
- [Document Handling](docs/markdown/document-handling.md)
- [Standard Components](docs/markdown/standard-components.md)
- [Advanced Scripting](docs/markdown/advanced-scripting.md)
- [Automation using IPC](docs/markdown/automation-using-ipc.md)
- [Native Components](docs/markdown/native-components.md)
- [Language Reference](docs/markdown/language-reference.md)