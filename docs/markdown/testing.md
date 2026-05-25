# Testing

Exon has two complementary testing layers: TypeScript unit/integration tests using Vitest,
and inline `.exon` tests embedded in sample files.

## TypeScript Tests (Vitest)

Test files live in `tests/` and are run with:

```bash
npm test
```

### Writing a Test

Use the `compile()` helper for inline Exon snippets:

```typescript
import { describe, it, expect } from "vitest";
import { compile } from "./helpers";

describe("string.join", () => {
    it("joins without separator", async () => {
        const result = await compile(`
            using fn.*
            string.join { "Hello" " " "World" }
        `);
        expect(result).toBe("Hello World");
    });

    it("joins with separator", async () => {
        const result = await compile(`
            using fn.*
            string.join { "a" "b" "c"  separator: "-" }
        `);
        expect(result).toBe("a-b-c");
    });
});
```

### Tests Requiring a Directory Layout

Use `compileAt()` for tests that involve file imports:

```typescript
import { compileAt } from "./helpers";

it("loads base type from subdirectory", async () => {
    const result = await compileAt("/tmp/mytest", `
        using models.User
        { user: models.User { name: "Alice" } }
    `);
    expect(result.user.name).toBe("Alice");
});
```

`compileAt()` writes the snippet to the given directory, sets the search path accordingly,
and resolves any imports relative to that location.

### Naming Conventions

Name the test file after the feature:

```
tests/string-join.test.ts
tests/inheritance.test.ts
tests/foreach-filter.test.ts
```

All shared helpers and fixtures belong in `tests/helpers.ts`. Do not define reusable
infrastructure inside individual test files.

## Exon-Level Tests

The `.exon` test framework lives in `tests/lib`. It exposes `describe`,
`it`, `toCatch`, and `toNotCatch` components.

Run a test file in test mode:

```bash
node bin/main.js -t examples/css/main.exon
```

The `-t` flag suppresses normal output and only shows test results.

### Writing an Exon Test

Add a `__tests__` key to any object:

```
using fn.*
using fn.eq
using fn.sequence
using ..exonmods.fne.test.*

{
    __tests__: sequence {
        describe {
            description: "math operations"

            it {
                "add returns correct sum"
                eq { add { 10 5 } 15 }
            }

            it {
                "div by zero raises exception"
                toCatch {
                    div { 10 0 }
                }
            }
        }
    }
}
```

`it` takes a description string as the first positional argument and an expression as the
second. The expression must return a truthy value for the test to pass.

`toCatch` passes if its body raises an exception. `toNotCatch` passes if it does not.

### Testing Properties

```
__tests__: sequence {
    describe {
        description: "email property"

        it {
            "valid email is accepted"
            toNotCatch {
                email { value: "user@example.com" }
            }
        }

        it {
            "invalid email raises exception"
            toCatch {
                email { value: "not-an-email" }
            }
        }
    }
}
```

## Running the Full Suite

```bash
npm test                               # TypeScript tests
node bin/main.js -t examples/Testing.exon   # Exon-level tests (if present)
```

Both suites must pass before merging any change.
