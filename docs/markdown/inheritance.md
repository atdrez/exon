# Inheritance and Overriding

## Base Types

When a type name appears before `{ }`, Exon loads the matching `.exon` file and merges its
properties with the new object. The child inherits every property from the parent and can
override any of them.

**db.exon** (base type):
```
{
    host:     "localhost"
    port:     5432
    poolSize: 5
}
```

**db2.exon** (inherits from db):
```
db {
    host: "prod.db.example.com"
    poolSize: 20
}
```

The resolved `database` object will be:
```json
{
    "host": "prod.db.example.com",
    "port": 5432,
    "poolSize": 20
}
```

Properties not mentioned in the child keep their parent values. Properties that are mentioned
replace the parent value entirely.

## Dot Notation and File Paths

The type name before `{ }` resolves to a file path using dot notation:

| Type name         | Resolved path                  |
|-------------------|-------------------------------|
| `db`              | `db.exon`                     |
| `models.Database` | `models/Database.exon`        |
| `infra.db.Prod`   | `infra/db/Prod.exon`          |

Exon searches the configured search paths (set with `-p <dir>`) plus the directory of the
current file.

## Chained Inheritance

Base types can themselves extend other types, forming a chain:

**base/Server.exon**:
```
{
    host:    "localhost"
    port:    8080
    timeout: 30
}
```

**config/ApiServer.exon** (extends base/Server):
```
using ..base.Server // includes ../base/Server.exon

Server {
    port:    443
    timeout: 60
}
```

**app.exon** (extends config/ApiServer):
```
{
    server: config.ApiServer {
        host: "api.example.com"
    }
}
```

Final resolved `app.exon`:
```json
{
    "server": {
        "host": "api.example.com",
        "port": 443,
        "timeout": 60
    }
}
```

## Selective Overriding

Override only what needs to change. This keeps configurations small and reduces duplication:

```
using environments.production

// Override only the feature flags; everything else from production.exon
production {
    featureFlags: {
        newCheckout: true
        betaSearch:  false
    }
}
```

## Using Inheritance for Variant Configs

A common pattern is a shared base with per-environment overrides:

**config/base.exon**:
```
{
    logLevel: "info"
    timeout:  30
    retries:  3
}
```

**config/production.exon**:
```
using config.base

config.base {
    logLevel: "warn"
    timeout:  60
}
```

**config/development.exon**:
```
using config.base

config.base {
    logLevel: "debug"
}
```

## Inheritance vs. Bindings

Inheritance copies property values at definition time. Bindings (`@ref`) reference properties
at resolution time. They serve different purposes:

- Use inheritance to share and reuse structure across files.
- Use bindings to reference a value computed elsewhere in the same file.

See [Bindings](bindings.md) for details.
