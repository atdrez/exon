# Getting Started

Exon is a language and runtime for defining structured object graphs. You write `.exon`
files that declare named objects with key-value properties; the runtime resolves them into
plain data (JSON, YAML, XML, plist, CSV) or runs them as scripts. This tutorial walks through
the core features with small, practical examples so you can start writing real `.exon` files
by the end.

Everything here is backed by working examples in this repo, see [../../examples/](../../examples/) and
the deeper guides in [../../docs/markdown/](../../docs/markdown/) for more.

## 1. Setup

```bash
git clone git@github.com:atdrez/exon.git
cd exon/runtimes/typescript
npm install
npm run build          # lint + tsc -> bin/
```

Run any file with:

```bash
node bin/main.js <file.exon> [args...]
```

## 2. Your First File

Create `hello.exon`:

```js
{
    message: "Hello, world!"
    version: 1.0
}
```

Run it:

```bash
node bin/main.js hello.exon
```

```json
{
    "message": "Hello, world!",
    "version": 1.0
}
```

A `.exon` file is a single top-level expression, usually an object literal `{ }`. There is
no special syntax for functions, loops, or operators; every capability beyond plain data is a
**component call**, which looks exactly like a named object.

## 3. Syntax Basics

Scalar types: strings (`"hello"`), numbers (`42`, `3.14`), booleans (`true`/`false`), and
`null`. Arrays use `[ ]`, nested objects use `{ }`:

```js
{
    tags:    [ "web", "api", "v2" ]
    server:  { host: "localhost" port: 8080 }
    auth:    { enabled: true provider: "oauth2" }
}
```

Semicolons between properties are optional, both of these work:

```
{ host: "localhost"; port: 8080 }
{ host: "localhost"  port: 8080 }
```

Comments: `//` for a line, `*** ... ***` for a block:

```js
{
    port: 8080  // inline comment

    ***
    This is a block comment.
    It can span multiple lines.
    ***
}
```

Multiline strings use triple quotes and are automatically **dedented**, the common leading
whitespace shared by every line is stripped, so you can indent the string to match your code
without that indentation leaking into the value:

```js
{
    description: """
        This spans multiple lines,
        and the leading indentation here
        is stripped automatically.
        """
}
```

## 4. Components and `using`

Any name followed by `{ }` is a component call. The standard library lives under the `fn.*`
namespace; import it once at the top of a file so you don't have to qualify every call:

```js
using fn.*

{
    sum:  add { 10 5 }
    text: string.join { "Result: " @root.sum }
    port: or { process.env { "PORT" } 8080 }
}
```

Without `using fn.*` you'd write `fn.add { 10 5 }` everywhere. Arguments can be positional
(bare values) or named (`key: value`), both can appear in the same call:

```js
using fn.*

{
    addition: add { 10 5 }                                   // positional
    message:  string.join { "Hello" ", " "world" separator: "" }  // positional + named
}
```

You can import selectively instead of the whole namespace:

```
using fn.string.join    // a single component
using fn.number.* as numLib   // a namespace, aliased
```

## 5. Splitting Config Across Files (Inheritance)

`using` also loads other `.exon` files. Dot notation maps to a file path: `models.Database`
resolves to `models/Database.exon`, `infra.db.Prod` resolves to `infra/db/Prod.exon`.

**db.exon**:

```js
{
    host:     "localhost"
    port:     5432
    poolSize: 5
}
```

**app.exon** use `db`'s filename as a type to inherit from it:

```js
{
    database: db {
        host: "prod.db.example.com"
    }
}
```

Resolved output:

```json
{
    "database": {
        "host": "prod.db.example.com",
        "port": 5432,
        "poolSize": 5
    }
}
```

The child keeps every property it didn't mention and overrides only what it declares. This is
the mechanism behind environment-specific configs (`config/base.exon` +
`config/production.exon`, `config/development.exon`, …) without duplicating shared settings.
Chains can go arbitrarily deep, a type can inherit from a type that inherits from another.

### Partial Object Override

Assigning a plain object to a property that already holds one **replaces** it entirely. To
merge instead, prefix the override with `*`:

```js
Child {
    port: 3030

    // merge only these two fields into the existing `database` object
    database: * {
        name:     "mydb"
        poolSize: 50
    }
}
```

A dotted-path shorthand does the same thing, and can nest arbitrarily deep:

```js
Child {
    database.name: "otherdb"
    database.variables.log: "info"
}
```

## 6. Bindings: Referencing Values with `@`

Bindings let a property reference another property's *resolved* value, evaluated lazily.

`@root` always refers to the root object of the current file:

```js
{
    port: 8080
    host: "localhost"

    address: fn.string.join { "http://" @root.host ":" @root.port }

    server: {
        endpoint: fn.string.join { @root.address "/api/v1" }
    }
}
```

Any object can also get its own name with `@name`, referenceable from anywhere in the file:

```js
fn.sequence {
    Object@person {
        name:    "Jane"
        surname: "Doe"
    }

    fn.string.join { "Hello " @person.name " " @person.surname }
}
```

Inside `foreach`/`while` bodies, `parameter{}` retrieves the current iteration value, and a
named binding on the loop body lets you refer to it by name:

```js
{
    items: ["alpha", "beta", "gamma"]

    result: fn.foreach {
        data: @root.items
        do: Object@item {
            value: fn.parameter{}
            upper: fn.string.join { "[" @item.value "]" }
        }
    }
}
```

Use **inheritance** to share and reuse structure across files, and **bindings** to reference a
computed value within the same file, they solve different problems.

## 7. Flow Control

All flow-control components are *deferred*: they receive their arguments unresolved and decide
themselves what to evaluate, which is what makes real conditionals and loops possible.

```js
using fn.*

{
    // if / else (else is optional; omitting it returns null)
    tier: if {
        condition: eq { @root.plan "pro" }
        then: "priority"
        else: "standard"
    }

    // cond: first matching condition wins; trailing odd item is the default
    grade: cond {
        ge { @root.score 90 } "A"
        ge { @root.score 80 } "B"
        "F"
    }

    // switch: match a single value against cases
    action: switch {
        value: process.env { "CMD" }
        "start" "Starting service..."
        "stop"  "Stopping service..."
        "Unknown command"
    }

    // foreach: map over an array, filtering out null results
    greetings: foreach {
        data: @root.names
        do: string.join { "Hello, " parameter{} "!" }
    }

    // coalesce: first non-null (0 and false count as defined)
    retries: coalesce { null null 3 }

    // or: first truthy value. handy for env-var fallbacks
    port: or { process.env { "PORT" } 8080 }
}
```

`try` / `raise` handle errors; `catch` receives the exception message via `parameter{}`:

```js
{
    port: fn.try {
        fn.sequence {
            fn.string.parseInt@value { fn.process.argv{1} }
            fn.if {
                condition: fn.not { fn.number.is{ @value } }
                then: fn.raise { "PORT must be a number" }
            }
            @value
        }
        catch: 8080
    }
}
```

See [flow-control.md](flow-control.md) for `while`, `repeat`, and
more detail.

## 8. Closures

`closure` defines a reusable block of logic that can be invoked any number of times with
`call`. Arguments passed to `call` are available inside the closure's body via `parameter{}`.

```js
using fn.*

sequence {
    closure@squareFn {
        mul { parameter{"n"} parameter{"n"} }
    }

    closure@factorialFn {
        sequence {
            parameter@n{"n"}

            cond {
                // if n <= 1 then return 1
                le { @n 1 }  1
                // else return (n * factorialFn(n - 1))
                mul { @n  call { @root  n: sub { @n 1 } } }
            }
        }
    }

    {
        // square(5) = 25
        square-of-five: call { @squareFn  n: 5 }

        // factorial(5) = 120
        factorial-of-five: call { @factorialFn  n: 5 }
    }
}
```

Give the closure a name with `@name` so it can be referenced later, then invoke it with
`call { @name  arg: value ... }` as many times as needed. Because a closure can reach itself
through its own binding (`@root` inside `factorialFn` refers to the closure being defined),
closures can call themselves recursively. See
[advanced-scripting.md](advanced-scripting.md) for more.

## 9. Math and Logic

```js
using fn.*

{
    tax:      mul { @root.price div { @root.taxRate 100 } }
    total:    add { @root.price @root.tax }
    clamped:  math.clamp { 150 0 100 }   // 100
    roles:    [ "admin" ]
    isAdmin:  in { "admin" @root.roles }  // membership check
    kind:     typeof { 42 }               // "number"
}
```

See [math-and-logic.md](math-and-logic.md) for the full operator
table, and [standard-components.md](standard-components.md) for
every built-in component (strings, collections, file I/O, process, serialization, and more).

## 10. Self-Validating Fields with `property`

The `property` component turns a plain field into an active getter/setter pair. Writes go
through `set` (which can reject or transform the value); reads go through `get`. This gives
you schema-free, field-level validation.

**lib/numclamp.exon** a property that clamps any number into `[min, max]`:

```js
using fn.*

property {
    min: 0
    max: 100
    _value: 0

    get: get { target: @root; property: "_value"; }

    set: set { target: @root; property: "_value";
        value: sequence {
            assert {
                number.is { parameter{} }
                message: "Wrong assignment: must receive a number"
            }
            math.clamp { parameter{} @root.min @root.max }
        }
    }
}
```

**constraints.exon** instantiate it like any other base type:

```js
{
    number: lib.numclamp { _value: 30 }
}
```

**Usage** validation happens transparently on assignment:

```js
{
    a: constraints {}                 // a.number = 30 (inherited)
    b: constraints { number: 20 }     // b.number = 20 (overridden)
    c: constraints { number: -20 }    // c.number = 0 (min clamped)
    d: constraints { number: 120 }    // d.number = 100 (max clamped)
    // e: constraints { number: "asd" }  // throws: not a number
}
```

This is the primary way to build strongly-typed domain languages on top of Exon's otherwise
untyped data model. See [property-feature.md](property-feature.md)
for an email-validation example using `regex.test`.

## 11. Multi-Format Output

Define your data once, then pick an encoder. Swapping the wrapper changes the output format;
the data definition doesn't change:

```js
using fn.*

sequence {
    content: {
        name: "app"
        config: { host: "localhost" port: 8080 }
    }

    format: or { process.argv{1} "json" }

    cond {
        eq { @root.format "yaml" }  yaml.encode  { @root.content }
        eq { @root.format "xml" }   xml.encode   { @root.content }
        eq { @root.format "plist" } plist.encode { @root.content }
        eq { @root.format "json" }  json.encode  { @root.content }
    }
}
```

Decoding works the same way in reverse (`json.decode`, `yaml.encode`, …), so you can read one
format, reshape the data with ordinary Exon, and re-encode it in another, see
[document-handling.md](document-handling.md).

## 12. Testing

Add a `__tests__` key to any object and run the file with `-t`:

```js
using fn.*
using ..exonmods.fne.test.*

{
    __tests__: sequence {
        describe {
            description: "math operations"

            it {
                "add returns correct sum"
                eq { add { 10 5 } 15 }
            }

            it {
                "div by zero raises exception"
                toCatch { div { 10 0 } }
            }
        }
    }
}
```

```bash
node bin/main.js -t path/to/file.exon
```

`it` takes a description and an expression that must be truthy to pass. `toCatch` /
`toNotCatch` assert whether an expression raises. For runtime-level tests, TypeScript specs
live in `runtimes/typescript/tests/` and run with `npm test`. See
[testing.md](testing.md).

## 13. Extending Exon: Native Components

No feature of Exon is built into the grammar, even `if` and `add` are components. You can add
your own without touching the runtime by writing a plain JavaScript module:

**components/greet.js**:

```javascript
module.exports.resolve = function (obj, context) {
    const name = obj.name || "World";
    return "Hello, " + name + "!";
};
```

Register and use it from any `.exon` file:

```js
{
    fn.native {
        id:   "lib.greet"
        path: "components/greet.js"
    }

    message: lib.greet { name: "Alice" }
}
```

If your component needs to control *when* its arguments are evaluated (like `if` does), export
`isDeferred` and call `context.resolve()` yourself on the raw AST nodes you receive. See
[native-components.md](native-components.md) for the deferred
pattern and for the (rarer) option of registering a component as a compiled TypeScript class
inside the runtime itself.

You can also define lightweight reusable components inline, without any `.exon` or `.js` file,
using `fn.component`:

```js
fn.component {
    id: "shop.total"
    content: wrapper {
        price: 0
        tax: 0
        content: add { @root.price mul { @root.price div { @root.tax 100 } } }
    }
}
```

## 14. Real-World Examples in This Repo

Once the basics click, these examples show Exon at larger scale:

- **[../../examples/buildsystem/](../../examples/buildsystem/)** a small `cmake`-like build system:
  discovers `.c`/`.h` files, generates a compile command, and shells out to `gcc`, using a
  namespace of native JS components (`emake.*`).
- **[../../examples/cloudformation/](../../examples/cloudformation/)** Exon's original motivating use
  case (the project started in 2017 to tame duplicated AWS CloudFormation JSON). Each AWS
  resource type is a reusable base file under `aws/`, composed into stacks under `stacks/`.
- **[../../examples/gui/](../../examples/gui/)** a declarative Tk/Ttk widget tree that generates Python
  GUI code; each widget type is a component, and event bindings become generated callback
  stubs.
- **[../../examples/llm/](../../examples/llm/)** drives an LLM (via `prompt`/`z.jsonSchema` components)
  with schema-constrained structured output and prompt-injection-aware system prompts, chaining
  a country lookup into a per-city `foreach`.
- **[../../examples/ipc/](../../examples/ipc/)** a parent process spawns an Exon worker over stdin/stdout
  and exchanges structured commands, with no shared protocol library required.

## 15. Where to Go Next

The full guide set lives in [../../docs/markdown/](../../docs/markdown/):

- [Basics](basics.md)
- [Inheritance](inheritance.md)
- [Bindings](bindings.md)
- [Flow Control](flow-control.md)
- [Math and Logic](math-and-logic.md)
- [Property Feature](property-feature.md)
- [Testing](testing.md)
- [Document Handling](document-handling.md)
- [Standard Components](standard-components.md)
- [Advanced Scripting](advanced-scripting.md) (closures, inline components,
  namespace libraries)
- [Automation using IPC](automation-using-ipc.md)
- [Native Components](native-components.md)
- [Language Reference](language-reference.md)

And browse [../../examples/](../../examples/) nearly every directory is small enough to read end-to-end
and doubles as a fixture for the test suite (`../../runtimes/typescript/tests/`).
