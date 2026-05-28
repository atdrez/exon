# Flow Control

All flow control components are *deferred*: they receive their arguments unresolved and
decide themselves when and whether to evaluate each branch. This enables true conditional
execution and loops.

## sequence

Evaluates each item in order and returns the value of the last one:

<!--#exon-->
<!-- ..data.markdown.snippet { "sequence" } -->
```js
{
    // Sequence returns the last element
    result: fn.sequence {
        fn.add@a { 1 2 } // a = 3
        fn.mul@b { @a 10 } // b = 30

        fn.sub { @b 2 } // result = 28
    }
}
```
<!--#endexon-->

`sequence` is often used to chain side effects with a final return value.

## if

Evaluates `condition`, then returns `then` or `else`:

<!--#exon-->
<!-- ..data.markdown.snippet { "ifelse" } -->
```js
{
    // result will receive object { x: 42 } or a string
    // depending if environment var ok is defined
    result: fn.if {
        condition: fn.defined { fn.process.env{"ok"} }
        then: { x: 42 }
        else: "nothing to see here"
    }
}
```
<!--#endexon-->

The `else` branch is optional. If omitted and the condition is false, `if` returns `null`.

## cond

Evaluates condition/result pairs in order and returns the result of the first matching
condition. An odd trailing item serves as the default branch:

<!--#exon-->
<!-- ..data.markdown.snippet { "cond" } -->
```js
{
    score: fn.coalesce { fn.process.env { "SCORE" } 0 }

    // grade based on score: A >= 90, B >= 80, C >= 70, else F
    grade: fn.cond {
        fn.ge { @root.score 90 }  "A"
        fn.ge { @root.score 80 }  "B"
        fn.ge { @root.score 70 }  "C"
        "F"
    }
}
```
<!--#endexon-->

Without a trailing default, `cond` returns `null` when no condition matches.

## switch

Compares a single `value` against named branches:

<!--#exon-->
<!-- ..data.markdown.snippet { "switch" } -->
```js
{
    result: fn.switch {
        value: fn.process.env { "CMD" }

        start:   "Starting service..."
        stop:    "Stopping service..."

        __default: fn.string.join { "Unknown command: " fn.process.env { "CMD" } }
    }
}
```
<!--#endexon-->

The `__default` key is the fallback when no branch matches.

## coalesce

Returns the first non-null argument. Unlike `or`, it treats `false` and `0` as valid values:

<!--#exon-->
<!-- ..data.markdown.snippet { "coalesce" } -->
```js
{
    // use env port if valid or fallback to 8080
    port: fn.coalesce { fn.process.env{"PORT"} 8080 }

    // unlike or, treats 0 and false as valid (non-null) values
    retries: fn.coalesce { null null 3 }
}
```
<!--#endexon-->

## foreach

Iterates an array and evaluates a body for each element. Returns an array of results:

<!--#exon-->
<!-- ..data.markdown.snippet { "foreach" } -->
```js
{
    names: [
        { name: "Alice" surname: "Baggins" },
        { name: "Bob" surname: "Smith" },
        { name: "Carol" surname: "Potter" }
    ]

    // receive an array of greeting messages
    greetings: fn.foreach {
        data: @root.names
        do: fn.sequence@entry {
            person: fn.parameter{}

            // return greeting message
            fn.string.join {
                "Hello, " @entry.person.name " " @entry.person.surname "!"
            }
        }
    }
}
```
<!--#endexon-->

`parameter{}` retrieves the current element.

Results from body evaluations are collected into the output array. Null results are filtered
out, making `foreach` useful as a combined filter-and-transform.

## while

Loops as long as `condition` is truthy. Returns an array of results from each iteration:

<!--#exon-->
<!-- ..data.markdown.snippet { "while" } -->
```js
{
    target: 5
    counter: 0

    data: fn.while {
        // loop while counter < target
        condition: fn.lt { @root.counter @root.target }

        do: fn.sequence {
            fn.println { fn.string.join { "N=" @root.counter } }

            fn.set {
                target: @root 
                property: "counter"
                // increment counter by 1
                value: fn.add { @root.counter 1 }
            }

            // return counter
            @root.counter
        }
    }
}
```
<!--#endexon-->

Use `set` to mutate state across iterations.

## repeat

Produces an array by repeating a value N times:

<!--#exon-->
<!-- ..data.markdown.snippet { "repeat" } -->
```js
{
    numbers: fn.repeat { content: 0 count: 5 }       // [0, 0, 0, 0, 0]
    strings: fn.repeat { content: "hello" count: 3 }     // ["hello", "hello", "hello"]
    objects: fn.repeat { content: { x: 10 } count: 2 }     // [{ x: 10}, {x: 10}]
    araysOfArrays: fn.repeat { content: [1, 2] count: 2 }     // [[1, 2], [1, 2]]
}
```
<!--#endexon-->

## try / raise

Wrap any expression in `try` to catch exceptions. Use `raise` to throw one:

<!--#exon-->
<!-- ..data.markdown.snippet { "trycatch" } -->
```js
{
    port: fn.try {
        fn.sequence {
            // parse first argument as int
            fn.string.parseInt@value {
                fn.process.argv{1}
            }

            // if not number, raise exception (check fn.assert)
            fn.if {
                condition: fn.not { fn.number.is{ @value } }
                then: fn.raise{"PORT must be a number"}
            }

            // return parsed value
            @value
        }
        catch: 8080 // define 8080 if exception was raised
    }
}
```
<!--#endexon-->

The `catch` branch receives the exception message via `parameter{}`:

<!--#exon-->
<!-- ..data.markdown.snippet { "trycatch-error" } -->
```js
{
    result: fn.try {
        fn.raise { "something went wrong" }
        catch: fn.sequence@err {
            msg: fn.parameter{}
            fn.string.join { "Caught: " @err.msg }
        }
    }
}
```
<!--#endexon-->