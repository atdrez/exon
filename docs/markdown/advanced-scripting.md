# Advanced Scripting

## Inline Components with fn.component

Define reusable components directly in `.exon` files without writing TypeScript:

<!--#exon-->
<!-- ..data.markdown.example { "component/main" } -->
```js
***
Demonstrates fn.component: define reusable components inline, without a .exon file.
Each fn.component block registers a new component under the given id. Callers supply
named parameters; any field left out falls back to the default declared in content.

Run:
  node ../../bin/main.js main.exon
***

using fn.*

{
    *** define a plain data component ***
    fn.component {
        id: "shop.data"
        content: {
            tax_rate:   20
            book_price: 10
            shoe_price: 60
        }
    }

    *** format.entry: formats a "label: value" string ***
    fn.component {
        id: "format.entry"
        content: wrapper {
            label: ""
            value: ""
            content: string.join { @root.label ": " @root.value }
        }
    }

    *** shop.total: adds a percentage tax to a base price ***
    fn.component {
        id: "shop.total"
        content: wrapper {
            price: 0
            tax: 0
            content: add { @root.price  mul { @root.price  div { @root.tax 100 } } }
        }
    }

    *** math.bound: clamps a value between lo and hi ***
    fn.component {
        id: "math.bound"
        content: wrapper {
            value: 0
            lo: 0
            hi: 100
            content: math.clamp { @root.value  @root.lo  @root.hi }
        }
    }

    *** data ***
    data: shop.data {
        // override book price
        book_price: 25
    }

    *** apply tax ***
    book_total: shop.total {
        price: @root.data.book_price
        tax: @root.data.tax_rate
    }

    shoe_total: shop.total {
        price: @root.data.shoe_price
        tax: @root.data.tax_rate
    }

    *** clamp a raw score to [0, 100] ***
    raw_score:    115
    bounded_score: math.bound { value: @root.raw_score  lo: 0  hi: 100 }

    *** build report lines using format.entry ***
    line_book:  format.entry { label: "Book total"  value: @root.book_total }
    line_shoe:  format.entry { label: "Shoe total"  value: @root.shoe_total }
    line_score: format.entry { label: "Score"       value: @root.bounded_score }

    report: string.join {
        @root.line_book
        @root.line_shoe
        @root.line_score
        separator: "\n"
    }
}

```
<!--#endexon-->

`wrapper` is a deferred component that exposes its fields as named parameters. `content` is
the computed return value.

## Loading Native JavaScript Modules

Register any JavaScript file as a named component with `fn.native`:

<!--#exon-->
<!-- ..data.markdown.example { "nativescript/base" } -->
```js
{
    fn.sequence {
        fn.native {
            id: "mylibname.foreach"
            path: "javascript/foreach.js"
        }
        fn.native {
            id: "mylibname.math.fibonacci"
            path: "javascript/fibonacci.js"
        }
    }

    fibonacci_sequence: mylibname.foreach {
        data: [1, 2, 3, 4, 5, 6, 7, 8]
        do: fn.string.join@v {
            num: fn.parameter {"value"}
            "Fibonacci number at #" @v.num " is " mylibname.math.fibonacci { value: @v.num }
        }
    }
}
```
<!--#endexon-->

The `path` is resolved relative to the current `.exon` file (or a configured search path).

### JavaScript Module Format

A native module exports a `resolve` function and optionally `isDeferred`:

<!--#exon-->
<!-- ..data.markdown.example { "nativescript/javascript/fibonacci" format: "js" extension: "js"} -->
```js
module.exports.resolve = function(obj, context) {
    if (typeof obj.value !== "number")
        throw new Error ("invalid value received: " + obj.value)

    function fib(n) {
        return n <= 1 ? n : fib(n-1) + fib(n-2);
    }

    return fib(obj.value);
};

// Optional: return true if the component should receive unresolved params
module.exports.isDeferred = function() { return false; };
```
<!--#endexon-->

The `context` object provides:
- `context.params()`: the first positional argument (already resolved unless deferred)
- `context.resolve(obj)`: resolve a sub-object
- `context.resolveFn(name)`: look up another registered component
- `context.location`: current `{ fileName, line }` for error messages

### Deferred Native Modules

A deferred module receives the raw, unresolved parameter object and controls evaluation
itself using `context.resolve()`:

```javascript
exports.resolve = function(obj, context) {
    const condition = context.resolve(obj.condition);
    if (condition) {
        return context.resolve(obj.then);
    }
    return obj.else ? context.resolve(obj.else) : null;
};

exports.isDeferred = function() { return true; };
```

## JavaScript Evaluation

`js.eval` executes a JavaScript expression string and returns the result:

<!--#exon-->
<!-- ..data.markdown.example { "evals/basic" } -->
```js
using fn.*

{
    result: js.eval {
        content: "return Math.PI * 2"
    }

    hash: js.eval {
        content: "return Math.random()"
    }

    answer: js.eval {
        content: string.join { "return Math.abs(" neg { add { 40 2 } } ")" }
    }
}
```
<!--#endexon-->

## Process Execution

Run shell commands and use their output:

```
using fn.*

{
    gitHash: string.split {
        process.exec { "git rev-parse --short HEAD" }
        separator: "\n"
    }

    nodeVersion: process.exec { "node --version" }

    files: string.split {
        process.exec { "find src -name '*.ts'" }
        separator: "\n"
    }
}
```

## Build System Example

The `examples/buildsystem/` directory shows a complete C build system implemented in Exon.
It discovers source files, generates a compile command, runs it, and reports the result,
all driven by `.exon` files and a small set of native JavaScript components:

<!--#exon-->
<!-- ..data.markdown.example { "buildsystem/build.run" } -->
```js
***
Behaves like cmake. 
Discovers all .c and .h files in srcDir and compiles them with gcc.
It can be extended via native script or custom components (check ./emake folder)

Build (passing the output name):
  ./ts-run.sh -r examples/buildsystem/build.run.exon

Build with custom compiler and custom output name:
  EMAKE_C_COMPILER=cc ./ts-run.sh -r examples/buildsystem/build.run.exon <output_name>
***

using emake.*
using fn.println
using fn.process.exec

{
    fn.assert {
      fn.defined { fn.process.argv {0} }
      message: "Script argument is missing"
    }

    dir: fn.path.dirname { fn.process.argv {0} }

    srcDir: fn.string.join { @root.dir "/src" }
    outDir: fn.string.join { @root.dir "/bin" }

    // use target passed via args, or fallback to hello
    target: fn.or { fn.process.argv { 1 } "hello" }

    // discover source and header files
    cFiles: discover { dir: @root.srcDir path: "*.c" }
    hFiles: discover { dir: @root.srcDir path: "*.h" }

    // display discovered files
    println { "discovered:" }
    display { category: "header" files: @root.hFiles }
    display { category: "source" files: @root.cFiles }

    // create compile command
    compileCmd: compile {
        files: @root.cFiles
        target: @root.target
        outputDir: @root.outDir
        includes: [ @root.srcDir ] // accept multiple includes
    }

    // make output directory
    exec { "mkdir -p " @root.outDir }

    // compile
    println { fn.string.join { "compiling:\n   " @root.compileCmd } }
    exec { @root.compileCmd }
    println { "build complete!" }

    println { "running:\n" }

    *** run compiled binary and capture output ***
    println {
        exec { fn.string.join { "./" @root.outDir "/" @root.target } }
    }
}

```
<!--#endexon-->

The `discover`, `display`, and `compile` components are thin native JavaScript wrappers
registered under the `emake.*` namespace, demonstrating how Exon scales from simple config
to full scripting.

## Namespace Libraries

Group related components under a namespace by placing their `.exon` or `.js` files in a
subdirectory and importing with a glob:

```
using mylib.*
```

This loads every `.exon` file in the `mylib/` directory and makes all their components
available under the `mylib.*` prefix. Namespace libraries let teams ship reusable component
collections without touching the Exon runtime.
