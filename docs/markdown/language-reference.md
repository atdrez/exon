# Language Reference

## Objects

An Exon file defines a single root object. An object is a block of key/value properties
enclosed in `{ }`. The type name before `{` is optional -- omitting it produces an anonymous
object:

```
{
    host: "localhost"
    port: 8080
    debug: false
    maxConnections: 100
    tags: [ "dev", "internal" ]
}
```

A named type resolves the base object from another `.exon` file (see Inheritance below):

```
Base {
    timeout: 30
}
```

Semicolons between properties are optional.

## Data Types

| Type    | Example                        |
|---------|--------------------------------|
| String  | `"hello"`, `"line\n"`          |
| Number  | `42`, `3.14`, `-100`           |
| Boolean | `true`, `false`                |
| Null    | `null`                         |
| Array   | `[ 1, "two", true ]`           |
| Object  | `{ key: value }`               |

## Multiline Strings

Triple-quoted strings span multiple lines. Leading and trailing whitespace is preserved as-is:

```
description: """
This spans
multiple lines.
"""
```

## Comments

Single-line comments start with `//`:

```
host: "localhost"  // inline comment
```

Multi-line comments are enclosed with `*** ... ***`:

```
*** comment ***

***
another
comment
***
```

## Inheritance

A file can inherit from another `.exon` file by using that file's name as the root type.
The resolver loads the referenced file, merges its properties, and then applies the properties
declared in the current file on top.

**Base.exon**
```
{
    host: "localhost"
    port: 8080
    debug: false
    maxConnections: 100
    tags: [ "dev", "internal" ]
}
```

**Child.exon**: inherits from Base.exon
```
Base {
    timeout: 30
    retryAttempts: 3
}
```

`Child.exon` produces all properties from `Base.exon` plus `timeout` and `retryAttempts`.
Properties declared in the child override those with the same name from the parent.

## Partial Object Override

When overriding a property that holds a nested object, use `*` instead of a full object type to merge only the listed properties rather than replacing the whole object:

```
Child {
    port: 3030
    timeout: 15

    // merge only name and poolSize into the existing database object
    database: * {
        name: "mydb"
        poolSize: 50
    }
}
```

Without `*`, assigning a new object literal would discard all fields not listed.

You can also override using one line like this:

```
Child {
    port: 3030
    timeout: 15

    database.name: "otherdb"
    database.poolSize: 50
}
```

It's basically the same. You can also nest how many layers needed.

```
Child {
    database.name: "otherdb"
    database.variables.log: "info"
}
```

## File References

Properties can reference objects defined in other `.exon` files using dot notation.
Dots are converted to path separators, so `basic.models.Database` resolves to
`basic/models/Database.exon` relative to the current file (or any configured search path).

Extra properties inside the block override those loaded from the referenced file:

```
// load basic/models/Database.exon and override name and poolSize
database: basic.models.Database {
    name: "appdb"
    poolSize: 20
}
```

**basic.models/Database.exon**
```
{
    host: "localhost"
    port: 5432
    name: ""
    poolSize: 5
}
```

Additional search paths can be specified with the `-p` flag at the command line.

## Bindings

A binding assigns an identifier to an object so that other properties can reference it by name.
The `@id` suffix on a type name (or `Object@id`) declares the binding:

```
{
    s: Object@server {
        host: "localhost"
        port: 8080
    }
    sHost: @root.s.host   // "localhost"
    serverHost: @server.host   // "localhost"
}
```

To read a property through a binding, use `@id.property`.

A binding reference can also appear inside a component call:

```
{
    host: "localhost"
    port: 8080
    result: fn.string.join {
        @root.host ":" @root.port
    }
}
```

## Component Calls

Native components use the `fn.*` namespace. A component call looks like an object with the
component name as the type:

```
value: fn.add { 10 5 }
```

**Positional arguments** (values without a key) are collected into an implicit array that the
component receives. Binary components require exactly two positional args; unary components
require one:

```
sum:    fn.add { 10 5 }         // positional: [10, 5]
isStr:  fn.string.is { "hi" }   // positional: ["hi"]
joined: fn.string.join { "a" "b" "c" separator: "-" }
```

**Named properties** are passed alongside positional args and provide configuration:

```
encoded: fn.json.encode {
    indent: 2

    {
        key: "value"
    }
}
```

Components that need to control evaluation order declare themselves **lazy**, they receive
raw (unresolved) values and call the resolver explicitly. `fn.if`, `fn.switch`, `fn.try`, and
`fn.wrapper` are lazy.

See [Standard Components](standard-components.md) for the full reference.
