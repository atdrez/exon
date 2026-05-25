# Getting Started

## Installation

Exon requires Node.js 18 or later.

```bash
git clone git@github.com:atdrez/exon.git
cd exon
npm install
cd runtimes/typescript
npx tsc          # compile TypeScript -> bin/
```

## Your First File

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

Output:
```json
{
    "message": "Hello, world!",
    "version": 1
}
```

## Using Built-in Components

Import the standard library with `using fn.*`, then call any component by name:

```js
using fn.*

{
    sum:  add { 10 5 }
    text: string.join { "Result: " @root.sum }
    port: or { process.env { "PORT" } 8080 }
}
```

Components use `{ }` for their arguments, named or positional.

## Splitting Config into Files

Create `db.exon`:

```js
{
    host: "localhost"
    port: 5432
    poolSize: 5
}
```

Reference it in `app.exon` using its filename as a type:

```
{
    database: db {
        host: "prod.db.example.com"
    }
}
```

The child object inherits all properties from `db.exon` and overrides only `host`.

## Environment-Aware Config

<!--#exon-->
<!-- ..data.markdown.snippet { "json-encode" } -->
```js
using fn.*

json.encode {
    env:  process.env { "ENV" }
    port: process.env { "PORT" }

    {
        server: {
            host: if {
                condition: eq { @root.env "production" }
                then: "api.example.com"
                else: "localhost"
            }
            port: coalesce { @root.port 8080 }
        }

        database: cond {
            eq { @root.env "production" } { name: "prod_db" }
            eq { @root.env "staging" } { name: "staging_db" }

            { name: "local_db" }
        }
    }
}
```
<!--#endexon-->

Run with:
```bash
ENV=production node bin/main.js app.exon
ENV=development PORT=9000 node bin/main.js app.exon
```

## Next Steps

- [Basics](basics.md) syntax, comments, arrays, objects
- [Inheritance](inheritance.md) base types and overriding
- [Bindings](bindings.md) cross-references with `@`
- [Flow Control](flow-control.md) if, foreach, while, switch
- [Math & Logic](math-and-logic.md) math and logical operators
- [Property Component](property-feature.md) property component
- [Standard Components](standard-components.md) full component reference
