# Creating Native Components

Exon provides two ways to add components without modifying the runtime: JavaScript modules
loaded at runtime with `fn.native`, and TypeScript classes compiled into the runtime. The
JavaScript approach is the right choice for most extensions.

## Option 1: JavaScript Modules (recommended)

### Writing the Module

A native module is a javascript module that exports a `resolve` function:

```javascript
// components/greet.js
module.exports.resolve = function(obj, context) {
    const name = obj.name || "World";
    return "Hello, " + name + "!";
};
```

`obj` contains the resolved argument object. `context` provides runtime utilities:

| Property / Method         | Description                                         |
|---------------------------|-----------------------------------------------------|
| `context.params()`        | First positional argument (already resolved)        |
| `context.resolve(x)`      | Recursively resolve a sub-expression                |
| `context.location`        | `{ fileName, line }` for error messages             |

Register the module in your `.exon` file:

```
{
    fn.native {
        id:   "lib.greet"
        path: "components/greet.js"
    }

    message: lib.greet { name: "Alice" }
}
```

### Deferred Modules

If the component must control when its arguments are evaluated, set `isDeferred`:

```javascript
// components/myif.js
module.exports.isDeferred = function() { return true; };

module.exports.resolve = function(obj, context) {
    const condition = context.resolve(obj.condition);
    if (condition)
        return context.resolve(obj.then);

    return obj["else"] ? context.resolve(obj["else"]) : null;
};
```

Without `isDeferred`, all fields on `obj` are already resolved before `resolve` is called.
With it, `obj` contains raw AST nodes that you resolve selectively.

### Multi-Module Libraries

Register several modules under a shared namespace:

```
fn.sequence {
    fn.native { id: "emake.discover"  path: "emake/discover.js" }
    fn.native { id: "emake.compile"   path: "emake/compile.js" }
    fn.native { id: "emake.display"   path: "emake/display.js" }
}
```

Then import with `using emake.*` in any file that needs them.

## Option 2: TypeScript Classes (built into runtime)

Implement the `IScript` interface from `src/IScript.ts`:

```typescript
import Base    from "./Base";
import Context from "../Context";

export default class Greet extends Base {
    constructor() {
        super("lib.greet");
    }

    public resolve(obj: any, context: Context): any {
        const name = obj.name || "World";
        return `Hello, ${name}!`;
    }
}
```

For deferred components, also implement `isDeferred()`:

```typescript
public isDeferred(): boolean { return true; }
```

### Registration

Add the class to `src/fn/index.ts`:

```typescript
import Greet from "./lib/Greet";

export function components(): IScript[] {
    return [
        // ... existing components ...
        new Greet(),
    ];
}
```

After running `npx tsc`, the component is available as `lib.greet` in any `.exon` file.

## Choosing Between Options

| Criterion                     | JavaScript Module | TypeScript Class |
|------------------------------|-------------------|-----------------|
| Requires recompile           | No                | Yes             |
| Ships next to `.exon` files  | Yes               | No              |
| Access to full Node.js APIs  | Yes               | Yes             |
| Type safety                  | No                | Yes             |
| Suitable for library authors | Yes               | Yes             |
| Suitable for app-level code  | Yes               | Rarely          |

Prefer JavaScript modules for project-specific components and things shipped alongside
`.exon` files. Use TypeScript classes when you are extending the runtime itself.
