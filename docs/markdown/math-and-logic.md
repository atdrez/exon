# Math and Logic

## Arithmetic

All arithmetic components take two positional arguments.

| Component | Operation       | Example                    | Result |
|-----------|-----------------|---------------------------|--------|
| `add`     | Addition        | `add { 10 5 }`            | `15`   |
| `sub`     | Subtraction     | `sub { 10 5 }`            | `5`    |
| `mul`     | Multiplication  | `mul { 4 3 }`             | `12`   |
| `div`     | Division        | `div { 10 4 }`            | `2.5`  |
| `mod`     | Modulo          | `mod { 10 3 }`            | `1`    |
| `pow`     | Exponentiation  | `pow { 2 8 }`             | `256`  |
| `neg`     | Negation        | `neg { 5 }`               | `-5`   |

Example with bindings:
```
using fn.*

{
    price:    100
    taxRate:  20

    tax:      mul { @root.price div { @root.taxRate 100 } }
    total:    add { @root.price @root.tax }
    discount: sub { @root.total mul { @root.total 0.1 } }
}
```

## Bounds and Clamping

```
using fn.*

{
    lo:      math.min { 3 7 }      // 3
    hi:      math.max { 3 7 }      // 7
    clamped: math.clamp { 150 0 100 }  // 100
}
```

`math.clamp` takes `{ value lo hi }` and returns `value` clamped to `[lo, hi]`.

## Comparison Operators

All comparisons return a boolean.

| Component | Meaning               | Example              |
|-----------|-----------------------|---------------------|
| `eq`      | Equal                 | `eq { 5 5 }`        |
| `ne`      | Not equal             | `ne { 5 3 }`        |
| `lt`      | Less than             | `lt { 3 5 }`        |
| `gt`      | Greater than          | `gt { 5 3 }`        |
| `le`      | Less than or equal    | `le { 5 5 }`        |
| `ge`      | Greater than or equal | `ge { 6 5 }`        |

## Boolean Logic

| Component | Meaning                     | Example                        |
|-----------|-----------------------------|-------------------------------|
| `and`     | Logical AND                 | `and { true false }`          |
| `or`      | Logical OR or first truthy  | `or { null "fallback" }`      |
| `xor`     | Exclusive OR                | `xor { true false }`          |
| `not`     | Logical NOT                 | `not { false }`               |

`or` is especially useful as a fallback: it returns the first non-null, non-false argument.
This makes it a common pattern for optional environment variables:

```
using fn.*

{
    port: or { process.env { "PORT" } 8080 }
    host: or { process.env { "HOST" } "localhost" }
}
```

## Null and Existence Checks

```
using fn.*

{
    // defined returns true if its argument is not null/undefined
    hasPort: defined { process.env { "PORT" } }

    // coalesce returns the first non-null argument
    // (unlike or, it treats false and 0 as valid values)
    retries: coalesce { null null 3 }

    // typeof returns a type string
    kind: typeof { 42 }       // "number"
    kind2: typeof { "hello" } // "string"
    kind3: typeof { null }    // "null"
}
```

## Membership

```
using fn.*

{
    roles: ["admin", "editor"]

    isAdmin: in { "admin" @root.roles }   // true
    isGuest: in { "guest" @root.roles }   // false

    // also works on objects (checks for key existence)
    cfg: { host: "localhost" }
    hasHost: in { "host" @root.cfg }      // true
}
```

## Type Checks

```
using fn.*

{
    a: number.is { 42 }         // true
    b: number.is { "42" }       // false
    c: string.is { "hello" }    // true
    d: string.is { 0 }          // false
}
```

## Combining Math and Logic

```
using fn.*

{
    score:  85
    bonus:  mul { @root.score 0.1 }
    total:  add { @root.score @root.bonus }

    grade: cond {
        ge { @root.total 90 } "A"
        ge { @root.total 80 } "B"
        ge { @root.total 70 } "C"
        "F"
    }
}
```
