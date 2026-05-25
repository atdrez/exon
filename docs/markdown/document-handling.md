# Document Handling

Exon can produce structured text documents in multiple formats from a single source. Swap the
encoding wrapper and the output format changes; the data definition stays the same.

## Encoding

<!--#exon-->
<!-- ..data.markdown.snippet { "doc-gen" } -->
```js
using fn.*

sequence {
    content: {
        name: "app"
        config: {
            host: "localhost"
            port: 8080
        }
    }

    // get first argument, or fallback to 'json'
    format: or { process.argv{1} "json"}

    cond {
        // output yaml
        eq {@root.format "yaml"} fn.yaml.encode { @root.content }

        // output xml
        eq {@root.format "xml"} fn.xml.encode { @root.content }

        // output plist
        eq {@root.format "plist"} fn.plist.encode { @root.content }

        // output json
        eq {@root.format "json"} fn.json.encode { @root.content }
    }
}
```
<!--#endexon-->

## Decoding

Read an existing document and reshape it:

```
using fn.*

{
    raw:  file.load { "config.json" }
    data: json.decode { @root.raw }

    // now use @root.data.anyField
    host: @root.data.host
    port: @root.data.port
}
```

## Transforming Between Formats

Decode one format, reshape the data, encode to another:

```
using fn.*

yaml.encode {
    {
        raw:    file.load { "input.json" }
        parsed: json.decode { @root.raw }

        name:  @root.parsed.name
        host:  @root.parsed.server.host
        tags:  @root.parsed.tags
    }
}
```

## Document Generation Pipeline

A typical document generation pipeline reads environment variables, applies conditional
logic, merges base types, and encodes the result:

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
