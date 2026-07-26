# Standard Components

Import all standard components with `using fn.*`, or import selectively:

```
using fn.add
using fn.string.join
using fn.process.env
```

<!--#exon-->
<!-- ..data.markdown.standardLib {} -->
## Arithmetic

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `add`   |   `{ a b }`   |   a + b   |
| `sub`   |   `{ a b }`   |   a - b   |
| `mul`   |   `{ a b }`   |   a * b   |
| `div`   |   `{ a b }`   |   a / b   |
| `mod`   |   `{ a b }`   |   a % b   |
| `pow`   |   `{ a b }`   |   a ** b   |
| `neg`   |   `{ a }`   |   -a   |

---

## Comparison

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `eq`   |   `{ a b }`   |   a === b   |
| `ne`   |   `{ a b }`   |   a !== b   |
| `lt`   |   `{ a b }`   |   a < b   |
| `gt`   |   `{ a b }`   |   a > b   |
| `le`   |   `{ a b }`   |   a <= b   |
| `ge`   |   `{ a b }`   |   a >= b   |

---

## Boolean Logic

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `and`   |   `{ a b ... }`   |   a && b && ...   |
| `or`   |   `{ a b ... }`   |   a || b || ...   |
| `not`   |   `{ a }`   |   !a   |
| `xor`   |   `{ a b }`   |   !!a !== !!b   |

---

## Flow Control

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `if`   |   `{ condition: v  then: a  else: b }`   |   conditional expression (else is optional)   |
| `while`   |   `{ condition: expr  do: statement  params: obj  includeNull: false }`   |   loop while condition is truthy, collect results into an array   |
| `switch`   |   `{ value: a  case result ... [default] }`   |   pattern-match a value against case/result pairs   |
| `sequence`   |   `{ a b ... }`   |   evaluate each argument in order, return the last   |
| `pass`   |   `{}`   |   no-op, returns undefined   |
| `coalesce`   |   `{ a b ... }`   |   return the first non-null, non-undefined value   |
| `cond`   |   `{ condition result ... [default] }`   |   multi-branch conditional expressed as condition/result pairs   |
| `foreach`   |   `{ data: array  do: statement  includeNull: false }`   |   map over an array or object and collect the results   |

---

## Introspection

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `defined`   |   `{ a }`   |   true if value is not null or undefined   |
| `typeof`   |   `{ a }`   |   JavaScript typeof with fixes for array and null   |
| `classname`   |   `{ a }`   |   return the Exon class name of an object   |
| `instanceof`   |   `{ a b }`   |   true if object is an instance of the named class   |
| `in`   |   `{ a b }`   |   true if value is in array, or key is in object   |

---

## Functional

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `lazy`   |   `{ a }`   |   defer evaluation until the value is accessed   |
| `closure`   |   `{ [capture: value ...]  expr }`   |   capture scope and create a reusable deferred computation   |
| `call`   |   `{ closure  [param: value ...] }`   |   invoke a fn.closure with optional named parameters   |

---

## Error Handling

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `try`   |   `{ expr  catch: handler  then: result }`   |   evaluate an expression and catch any error   |
| `raise`   |   `{ a }`   |   throw an error with the given message   |
| `assert`   |   `{ a  message: "error" }`   |   throw when a value is falsy   |

---

## String

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `string.join`   |   `{ a b ... separator: "" }`   |   concatenate multiple strings into one   |
| `string.concat`   |   `{ a b ... }`   |   concatenate strings — all values must be strings   |
| `string.split`   |   `{ a separator: " " }`   |   split a string into an array   |
| `string.trim`   |   `{ a }`   |   remove leading and trailing whitespace   |
| `string.trimStart`   |   `{ a }`   |   remove leading whitespace   |
| `string.trimEnd`   |   `{ a }`   |   remove trailing whitespace   |
| `string.is`   |   `{ a }`   |   true if value is a string   |
| `string.isEmpty`   |   `{ a }`   |   true if string has zero length   |
| `string.length`   |   `{ a }`   |   number of characters in the string   |
| `string.parseInt`   |   `{ a }`   |   parse a string as a base-10 integer   |
| `string.parseFloat`   |   `{ a }`   |   parse a string as a floating-point number   |
| `string.replace`   |   `{ a  search: "pattern"  replacement: "value" }`   |   replace the first occurrence of a substring   |
| `string.replaceAll`   |   `{ a  search: "pattern"  replacement: "value" }`   |   replace all occurrences of a substring   |
| `string.startsWith`   |   `{ a b }`   |   true if string starts with the given prefix   |
| `string.endsWith`   |   `{ a b }`   |   true if string ends with the given suffix   |
| `string.includes`   |   `{ a b }`   |   true if string contains the given substring   |
| `string.indexOf`   |   `{ a b }`   |   index of the first occurrence of a substring (-1 if not found)   |
| `string.charAt`   |   `{ a  index: n }`   |   character at the given zero-based index   |
| `string.slice`   |   `{ a  start: n  end: n }`   |   extract a substring by start and optional end index   |
| `string.padStart`   |   `{ a  length: n  pad: " " }`   |   pad the start of a string to reach a target length   |
| `string.padEnd`   |   `{ a  length: n  pad: " " }`   |   pad the end of a string to reach a target length   |
| `string.repeat`   |   `{ a  count: n }`   |   repeat a string n times   |
| `string.toUpperCase`   |   `{ a }`   |   convert string to upper case   |
| `string.toLowerCase`   |   `{ a }`   |   convert string to lower case   |

---

## Number

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `number.is`   |   `{ a }`   |   true if value is a valid number (not NaN)   |

---

## Array

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `array.is`   |   `{ a }`   |   true if value is an array   |
| `array.isEmpty`   |   `{ a }`   |   true if array has zero length   |
| `array.join`   |   `{ a b ... }  or  { arr }`   |   collect positional values, or flatten a single array argument, into one array   |
| `array.concat`   |   `{ a b ... }  or  { arr }`   |   concatenate two or more arrays into one   |
| `array.contains`   |   `{ a b }`   |   true if array a includes value b   |

---

## Math

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `math.min`   |   `{ a b ... }`   |   smallest of two or more numbers   |
| `math.max`   |   `{ a b ... }`   |   largest of two or more numbers   |
| `math.clamp`   |   `{ value min max }`   |   clamp a value to the [min, max] range   |
| `math.abs`   |   `{ a }`   |   absolute value of a number   |
| `math.ceil`   |   `{ a }`   |   round a number up to the nearest integer   |
| `math.floor`   |   `{ a }`   |   round a number down to the nearest integer   |
| `math.round`   |   `{ a }`   |   round a number to the nearest integer   |
| `math.truncate`   |   `{ a }`   |   integer part of a number, discarding any fractional digits   |
| `math.sqrt`   |   `{ a }`   |   square root of a number   |
| `math.log`   |   `{ a }`   |   natural logarithm of a number   |
| `math.sin`   |   `{ a }`   |   sine of an angle in radians   |
| `math.cos`   |   `{ a }`   |   cosine of an angle in radians   |
| `math.tan`   |   `{ a }`   |   tangent of an angle in radians   |

---

## Regex

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `regex.test`   |   `{ a  pattern: "regex"  flags: "" }`   |   test if a string matches a regular expression   |
| `regex.match`   |   `{ a  pattern: "regex"  flags: "" }`   |   find the first match of a regular expression in a string   |
| `regex.matchAll`   |   `{ a  pattern: "regex"  flags: "" }`   |   find all matches of a regular expression in a string   |

---

## Collections

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `map`   |   `{ keys: array  values: array }`   |   build an object from parallel keys and values arrays   |
| `merge`   |   `{ a b ... }`   |   shallow-merge two or more objects using spread   |
| `reverse`   |   `{ a ... }`   |   reverse an array   |
| `count`   |   `{ a }`   |   number of elements in an array   |
| `repeat`   |   `{ count: n  content: value }`   |   produce an array of n copies of content   |
| `dict`   |   `{ key value ... }`   |   build an object from a flat list of key/value pairs   |
| `table`   |   `{ columns: array  a b ... }`   |   build an array of row objects from column names and flat values   |

---

## Mutation

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `get`   |   `{ target: obj  property: key }  or  { target: arr  index: n }`   |   read a property or array element from an object   |
| `set`   |   `{ target: obj  property: key  value: v }  or  { target: arr  index: n  value: v }`   |   write a value to a property or array element   |
| `del`   |   `{ target: obj  property: key  index: n }`   |   delete a property or splice an element from an array   |

---

## IO

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `println`   |   `{ a ... }`   |   print concatenated arguments to stdout   |
| `io.write`   |   `{ a ... }`   |   write concatenated arguments to stdout, no trailing newline   |
| `io.writeLine`   |   `{ a ... }`   |   write concatenated arguments to stdout followed by a newline   |
| `io.read`   |   `{}`   |   block and read all of stdin until EOF   |
| `io.readLine`   |   `{}`   |   block and read a single line from stdin   |

---

## Process

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `process.env`   |   `{ "VAR_NAME" }`   |   read an environment variable by name   |
| `process.exec`   |   `{ a ... }  or  { a ... argv: [...] stdin: "..." shell: bool }`   |   run a shell command synchronously and return stdout   |
| `process.argv`   |   `{ }  or  { index }  or  { name }`   |   access command-line arguments passed to the runtime   |
| `process.exit`   |   `{ code }`   |   terminate the process with an exit code   |

---

## File System

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `file.load`   |   `{ path: str  binary: false }`   |   read a file from disk   |
| `file.save`   |   `{ path: str  data: content }`   |   write data to a file on disk   |
| `file.exists`   |   `{ path: str }`   |   true if a file or directory exists at the given path   |
| `file.stat`   |   `{ path: str }`   |   return filesystem metadata for a path   |
| `file.delete`   |   `{ path: str }`   |   delete a file or directory   |
| `file.copy`   |   `{ from: str  to: str }`   |   copy a file or directory   |
| `file.move`   |   `{ from: str  to: str }`   |   move or rename a file or directory   |

---

## Path

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `path.dirname`   |   `{ a }`   |   directory portion of a path   |
| `path.basename`   |   `{ a }`   |   filename portion of a path   |
| `path.extension`   |   `{ a }`   |   file extension of a path (including the leading dot)   |
| `path.isfile`   |   `{ a }`   |   true if the path points to an existing file   |
| `path.isdir`   |   `{ a }`   |   true if the path points to an existing directory   |
| `path.absolute`   |   `{ a }`   |   resolve a path to an absolute path   |
| `path.real`   |   `{ a }`   |   resolve symlinks in a path as far as they exist on disk   |
| `path.resolve`   |   `{ a b }`   |   join and normalize two path segments   |
| `path.isInside`   |   `{ a b }`   |   true if path a is inside directory b   |
| `path.relative`   |   `{ a b }`   |   relative path from a to b   |
| `path.listDir`   |   `{ a }`   |   list the immediate entries of a directory   |
| `path.walk`   |   `{ a  pattern: "regex"  flags: ""  maxDepth: -1 }`   |   recursively list filesystem entries under a directory   |

---

## OS

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `os.platform`   |   `{}`   |   operating system platform identifier   |
| `os.arch`   |   `{}`   |   CPU architecture identifier   |
| `os.type`   |   `{}`   |   operating system name   |
| `os.release`   |   `{}`   |   operating system release version string   |

---

## HTTP

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `http.fetch`   |   `{ url: str  method: "GET"  headers: {}  body: str }`   |   perform a synchronous HTTP request   |

---

## Serialization

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `json.encode`   |   `{ a  indent: 4 }`   |   serialize an object to a JSON string   |
| `json.decode`   |   `{ content: jsonString }`   |   parse a JSON string into an object   |
| `xml.encode`   |   `{ a  root: "tag" }`   |   serialize an object to an XML string   |
| `yaml.encode`   |   `{ a }`   |   serialize an object to a YAML string   |
| `plist.encode`   |   `{ a }`   |   serialize an object to Apple Property List XML   |
| `csv.encode`   |   `{ a }`   |   serialize an array of objects to a CSV string   |
| `csv.decode`   |   `{ content: csvString }`   |   parse a CSV string into an array of objects   |

---

## Extensibility

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `component`   |   `{ id: name  content: obj }`   |   define a reusable inline component   |
| `native`   |   `{ id: name  path: relPath }`   |   load a JavaScript module as a component   |
| `import`   |   `{ path }  or  { id: name  path }`   |   load and resolve another .exon file, or register it as a component   |
| `property`   |   `{ get: expr  set: expr  init: expr }`   |   define a typed getter/setter property   |
| `parameter`   |   `{ }  or  { name }`   |   read a named parameter from the caller   |
| `wrapper`   |   `{ content: expr }`   |   resolve and return the content property   |
| `preprocess`   |   `{ file: path  style: "js"  pattern: obj }`   |   perform Exon-driven source code preprocessing   |

---

## JavaScript

| Component           | Signature                  | Description              |
|---------------------|----------------------------|--------------------------|
| `js.eval`   |   `{ content: jsCode  [key: value ...] }`   |   evaluate a JavaScript snippet with variable substitution   |
<!--#endexon-->