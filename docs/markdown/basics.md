# Basics

## Syntax Overview

An Exon file contains a single top-level expression. That expression is usually an object literal `{ }`, a component call, or an encoding wrapper.

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

### Scalar Types

| Type    | Example                  |
|---------|--------------------------|
| String  | `"hello"`, `"line\n"`   |
| Number  | `42`, `-7`, `3.14`      |
| Boolean | `true`, `false`          |
| Null    | `null`                   |

### Arrays

```
tags:    [ "web", "api", "v2" ]
numbers: [ 1, 2, 3, 4 ]
mixed:   [ "a", 1, true, null ]
```

### Nested Objects

<!--#exon-->
<!-- ..data.markdown.example { "basic/nested" } -->
```js
{
    server: {
        host: "localhost"
        port: 8080
    }
    auth: {
        enabled: true
        provider: "oauth2"
    }
}
```
<!--#endexon-->

### Semicolons

Semicolons are optional separators. Both forms work:

```
{ host: "localhost"; port: 8080 }
{ host: "localhost"  port: 8080 }
```

## Comments

Line comments use `//`:
<!--#exon-->
<!-- ..data.markdown.snippet { "comment-oneline" } -->
```js
{
    port: 8080  // inline comment
}
```
<!--#endexon-->

Block comments use `*** ... ***`:
<!--#exon-->
<!-- ..data.markdown.snippet { "comment-multiline" } -->
```js
{
    ***
    This is a block comment.
    It can span multiple lines.
    ***
    port: 8080
}
```
<!--#endexon-->

## Imports

`using` brings a namespace into scope. It accepts a file path expressed as dot notation or
a glob pattern:

<!--#exon-->
<!-- ..data.markdown.snippet { "imports" } -->
```js
using fn.*             // all standard library functions/namespaces
using fn.string.join   // a single component: join (from fn.string.*)
using models.Database  // import models/Database.exon
using lib.*            // import lib/ namespace
using fn.number.* as numLib // import a namespace using an alias
using fn.string.is as isString // import a component using an alias
```
<!--#endexon-->

Dot notation resolves to a file path relative to the search path:
- `models.Database` -> `models/Database.exon`
- `lib.*` -> every `.exon` file under `lib/`

Add extra search paths with `-p <dir>` when running.

## Component Calls

Any name followed by `{ }` is a component call. Arguments can be positional or named:

<!--#exon-->
<!-- ..data.markdown.snippet { "component-calls" } -->
```js
using fn.*
{
    // positional
    addition: add { 10 5 }
    message: string.join { "Hello" ", " "world" }

    // positional + named
    otherMessage: string.join { "Hello" " " "world"  separator: "" }

    // nested
    description: string.join { "Port is " or { process.env { "PORT" } 8080 } }
}
```
<!--#endexon-->

Named arguments like the `separator` are read by the component itself.
Positional arguments are the remaining items in the block.

## Default Objects

An object without a key name is treated as default Object type, and is the same as
declaring Object {}
```
{
    obj1: {

    }
    obj2: Object {
        // same as above
    }
}
```

## The `using fn.*` Line

Most files begin with `using fn.*`. Without it, you must qualify each name with the
`fn.` prefix:

```
fn.add { 10 5 }
fn.string.join { "a" "b" }
```