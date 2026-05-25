# Standard Components

Import all standard components with `using fn.*`, or import selectively:

```
using fn.add
using fn.string.join
using fn.process.env
```

---

## Arithmetic

| Component  | Signature                  | Description              |
|------------|---------------------------|--------------------------|
| `add`      | `{ a b }`                 | `a + b`                  |
| `sub`      | `{ a b }`                 | `a - b`                  |
| `mul`      | `{ a b }`                 | `a * b`                  |
| `div`      | `{ a b }`                 | `a / b`                  |
| `mod`      | `{ a b }`                 | `a % b`                  |
| `pow`      | `{ a b }`                 | `a ** b`                 |
| `neg`      | `{ a }`                   | `-a`                     |
| `math.min` | `{ a b }`                 | minimum of a and b       |
| `math.max` | `{ a b }`                 | maximum of a and b       |
| `math.clamp` | `{ value lo hi }`      | clamp value to [lo, hi]  |

---

## Comparison

| Component | Signature   | Description        |
|-----------|------------|-------------------|
| `eq`      | `{ a b }`  | a === b           |
| `ne`      | `{ a b }`  | a !== b           |
| `lt`      | `{ a b }`  | a < b             |
| `gt`      | `{ a b }`  | a > b             |
| `le`      | `{ a b }`  | a <= b            |
| `ge`      | `{ a b }`  | a >= b            |

---

## Boolean Logic

| Component | Signature          | Description                            |
|-----------|--------------------|----------------------------------------|
| `and`     | `{ a b }`          | a && b                                 |
| `or`      | `{ a b }`          | a \|\| b, first truthy value           |
| `xor`     | `{ a b }`          | exclusive OR                           |
| `not`     | `{ a }`            | !a                                     |
| `defined` | `{ a }`            | true if a is not null/undefined        |
| `typeof`  | `{ a }`            | type string: "number", "string", etc.  |
| `in`      | `{ key target }`   | key exists in array or object          |

---

## Null and Fallback

| Component  | Signature              | Description                                    |
|------------|------------------------|------------------------------------------------|
| `or`       | `{ a b ... }`          | first truthy value                             |
| `coalesce` | `{ a b ... }`          | first non-null value (0 and false are valid)   |
| `cond`     | `{ cond val ... def }` | first matching condition/value pair            |

---

## Flow Control (deferred)

| Component  | Key Arguments                          | Description                        |
|------------|---------------------------------------|-----------------------------------|
| `if`       | `condition`, `then`, `else`           | conditional expression             |
| `switch`   | `value`, named branches, `__default`  | multi-way branch                   |
| `cond`     | alternating condition/value pairs     | first-match selector               |
| `foreach`  | `data`, `do`                          | iterate array, collect results     |
| `while`    | `condition`, `do`                     | loop while condition is truthy     |
| `repeat`   | `value`, `count`                      | produce array of repeated value    |
| `try`      | body, `catch`                         | exception handling                 |
| `raise`    | `{ message }`                         | throw an exception                 |
| `sequence` | positional items                      | evaluate in order, return last     |

---

## Type Checking

| Component   | Signature  | Description               |
|-------------|-----------|--------------------------|
| `number.is` | `{ a }`   | true if a is a number    |
| `string.is` | `{ a }`   | true if a is a string    |
| `typeof`    | `{ a }`   | type name as string      |

---

## String

| Component        | Signature                            | Description                       |
|-----------------|--------------------------------------|----------------------------------|
| `string.join`   | `{ a b ...  separator: "" }`         | concatenate with optional sep    |
| `string.split`  | `{ a  separator: " " }`             | split string into array          |
| `string.is`     | `{ a }`                              | type check                       |
| `string.isEmpty`| `{ a }`                              | true if empty or null            |
| `string.length` | `{ a }`                              | length in characters             |
| `string.trim`   | `{ a }`                              | strip leading/trailing whitespace|
| `string.endsWith`| `{ a suffix }`                     | suffix check                     |
| `string.parseInt`| `{ a }`                            | parse to integer                 |

---

## Collections

| Component  | Signature                         | Description                              |
|------------|----------------------------------|------------------------------------------|
| `count`    | `{ a }`                          | number of elements in array or object    |
| `reverse`  | `{ a }`                          | reverse an array                         |
| `merge`    | `{ a b ... }`                    | deep merge objects                       |
| `map`      | `{ keys values }`                | build object from key/value arrays       |
| `get`      | `{ target index/property }`     | get element by index or key              |
| `set`      | `{ target property value }`     | set a named field on an object           |
| `pass`     | `{ a }`                          | identity / pass-through                  |

---

## Assertions

| Component | Signature                     | Description                           |
|-----------|------------------------------|--------------------------------------|
| `assert`  | `{ condition  message: "" }` | raise if condition is falsy           |

---

## Regex

| Component    | Signature                     | Description           |
|-------------|------------------------------|-----------------------|
| `regex.test` | `{ value  pattern: "" }`    | test regex pattern    |

---

## I/O and Output

| Component | Signature          | Description                     |
|-----------|-------------------|---------------------------------|
| `println` | `{ value }`       | print to stdout                 |
| `parameter`| `{ name }`       | get named argument from context |

---

## Process

| Component       | Signature        | Description                             |
|-----------------|-----------------|----------------------------------------|
| `process.env`   | `{ "NAME" }`    | get environment variable               |
| `process.argv`  | `{ index }`     | get command-line argument by index     |
| `process.exec`  | `{ command }`   | execute shell command, return stdout   |

---

## File System

| Component       | Signature           | Description                     |
|----------------|--------------------|---------------------------------|
| `file.load`     | `{ "path" }`       | load file contents as string    |
| `path.isfile`   | `{ "path" }`       | true if path is a file          |
| `path.isdir`| `{ "path" }`    | true if path is a directory     |

---

## Serialization

| Component     | Signature                   | Description                      |
|--------------|----------------------------|----------------------------------|
| `json.encode` | `{ indent: N  object }`    | serialize to JSON string         |
| `json.decode` | `{ string }`               | parse JSON string                |
| `yaml.encode` | `{ object }`               | serialize to YAML string         |
| `xml.encode`  | `{ object }`               | serialize to XML string          |
| `plist.encode`| `{ object }`               | serialize to plist format        |

---

## Extensibility (deferred)

| Component     | Key Arguments             | Description                               |
|--------------|--------------------------|------------------------------------------|
| `fn.component`| `id`, `content`          | define a reusable inline component       |
| `fn.native`   | `id`, `path`             | load a JavaScript module as a component  |
| `property`    | `get`, `set`, fields     | define typed getter/setter property      |
| `wrapper`     | named fields, `content`  | expose fields as params, evaluate content|
| `js.eval`     | `{ expression }`         | evaluate a JavaScript expression string  |

---

## IPC

| Component         | Signature      | Description                            |
|------------------|---------------|----------------------------------------|
| `ipc.getmessage`  | `{ }`         | receive a message from parent process  |
| `ipc.sendmessage` | `{ object }`  | send a message to parent process       |
