# Property Feature

The `property` component defines a getter/setter pair for a field. It turns a plain value
into an active validator: writes go through the setter (which can reject, transform, or
clamp the value) and reads go through the getter.

## The `get` and `set` Operators

These two operators read and write named fields on an object:

<!--#exon-->
<!-- ..data.markdown.snippet { "getset" } -->
```js
{
    count: 10

    // a = 10
    a: fn.get { target: @root property: "count" }

    // increment count
    _inc: fn.set {
        target: @root
        property: "count"
        value: fn.add { @root.count 5 }
    }

    // b = count = 15
    b: fn.get { target: @root property: "count" }
}
```
<!--#endexon-->

## Defining a Property

A property type is an `.exon` file that contains a top-level `fn.property` block:

**numberConstraint.exon**:
<!--#exon-->
<!-- ..data.markdown.snippet { "numberConstraint" } -->
```js
// numberConstraint.exon
fn.property {
    min: 0
    max: 100
    _value: 0

    get: fn.get { target: @root  property: "_value" }

    set: fn.sequence {
        fn.assert {
            fn.number.is {fn.parameter { "value" }}
            message: "Value must be a number"
        }
        fn.set {
            target: @root  property: "_value"
            value: fn.math.clamp { fn.parameter { "value" } @root.min @root.max }
        }
    }

    init: fn.sequence {
        fn.assert {
            fn.number.is {@root._value}
            message: "Value must be a number"
        }
        fn.set {
            target: @root  property: "_value"
            value: fn.math.clamp { fn.parameter { "value" } @root.min @root.max }
        }
    }
}
```
<!--#endexon-->

## Using a Property Type

Import and instantiate property types the same way as regular base types:

**constraints.exon**:
<!--#exon-->
<!-- ..data.markdown.snippet { "constraints" } -->
```js
// constraints.exon
{
   number: numberConstraint { _value: 30 } // initial value
}
```
<!--#endexon-->

<!--#exon-->
<!-- ..data.markdown.snippet { "clamp-usage" } -->
```js
{
   // a.number = 30 (inherited)
   a: constraints {}

   // b.number = 20 (overriden)
   b: constraints { number: 20 }

   // c.number = 0 (min clamped)
   c: constraints { number: -20 }

   // d.number = 100 (max clamped)
   d: constraints { number: 120 }

   // throw exception if uncommented (not a number)
   //e: constraints { number: "asd" }
}
```
<!--#endexon-->

Attempting to assign a non-number raises an exception.

## Email Validation Property

<!--#exon-->
<!-- ..data.markdown.example { "property/lib/email" } -->
```js
***
Enforce string type and email regex checking
***

using fn.*

property {
    _value: ""

    get: get {
        target: @root
        property: "_value"
    }

    set: set {
        target: @root
        property: "_value"
        value: sequence {
            assert {
                string.is { parameter { "value" } }
                message: "Invalid type: must be string"
            }

            // check email pattern
            assert {
                regex.test {
                    parameter { "value" }
                    pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"
                }
                message: "Invalid email format"
            }

            // return value
            parameter { "value" }
        }
    }
}
```
<!--#endexon-->

## Why Use Properties

Properties make types self-validating. A file importing a property type from `lib/` can
rely on all validation being applied transparently on write, without sprinkling `assert`
calls throughout the business logic. They are the primary mechanism for building strongly-
typed domain languages in Exon.
