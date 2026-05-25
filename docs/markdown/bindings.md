# Bindings

Bindings let any property reference the value of another property using the `@` prefix. They
are resolved at runtime, so they always reflect the final computed value.

## The `@root` Binding

`@root` is an implicit binding that refers to the root object of the current file. Use it to
reference any top-level property from anywhere inside the file:

<!--#exon-->
<!-- ..data.markdown.snippet { "binding" } -->
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
<!--#endexon-->

Dot chains navigate nested objects: `@root.server.endpoint`, `@root.db.host`.

## Named Bindings

Attach a name to any object with `@name` syntax. That name can then be referenced from
inside or outside the object:

<!--#exon-->
<!-- ..data.markdown.snippet { "binding-named" } -->
```js
fn.sequence {
    Object@person {
        name:    "Jane"
        surname: "Doe"
    }

    fn.string.join { "Hello " @person.name " " @person.surname }
}
```
<!--#endexon-->

The binding name `@person` is scoped to the object file where it is declared.

## Chaining References

Bindings can reference other bindings:

<!--#exon-->
<!-- ..data.markdown.snippet { "binding-chained" } -->
```js
{
    r:       "red"
    r_ref:   @root.r
    r_again: @root.r_ref
}
```
<!--#endexon-->

All three resolve to `"red"`.

## Computed Bindings

Bindings work anywhere an expression is expected, including inside component calls:

<!--#exon-->
<!-- ..data.markdown.snippet { "binding-computed" } -->
```js
{
    base:    80
    taxRate: 20

    tax:     fn.mul { @root.base fn.div { @root.taxRate 100 } }
    total:   fn.add { @root.base @root.tax }

    label:   fn.string.join { "Total: $" @root.total }
}
```
<!--#endexon-->

## Bindings in Loops and Deferred Components

Inside `foreach`, `while`, and similar deferred components, use the binding name attached
to the inner object to reference iteration-scoped values:

<!--#exon-->
<!-- ..data.markdown.snippet { "binding-loop" } -->
```js
{
    items: ["alpha", "beta", "gamma"]

    result: fn.foreach {
        data: @root.items
        do: Object@item {
            value: fn.parameter { "value" }
            upper: fn.string.join { "[" @item.value "]" }
        }
    }
}
```
<!--#endexon-->

The `parameter { "value" }` call retrieves the current iteration value. `@item` references
the current iteration object.

## Cross-File References

`@root` always refers to the root of the *current* file. When inheriting from a base type,
the resolved object is merged before bindings are evaluated, so `@root` in the child file
always points to the child's root.
