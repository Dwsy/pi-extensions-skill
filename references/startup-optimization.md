# Extension Startup Optimization

> How to make extensions load fast. jiti transpilation is the #1 bottleneck.

## The Problem

Pi uses [jiti](https://github.com/unjs/jiti) (with `moduleCache: false`) to transpile every `.ts` extension on every startup. Each `.ts` file invokes a full TypeScript → JavaScript compilation pass. Multiply by N files and you get 1-2 seconds of cold start overhead.

```
extensions/*.ts          → jiti transpiles each one         → ~50-600ms each
extensions/*/index.ts    → jiti transpiles entry + deps     → file count × cost
```

## Golden Rule

> **Write extensions in `.js`, not `.ts`.**
>
> jiti skips `.js` files — they are required directly with zero transpilation cost.

```typescript
// ❌ BAD: 50-600ms jiti cost per file
// extensions/my-ext.ts
export default function(pi) { ... }

// ✅ GOOD: ~0ms, loaded directly
// extensions/my-ext.js
export default function(pi) { ... }
```

The TypeScript type annotations from `@earendil-works/pi-coding-agent` are useful for development but **not needed in the compiled extension**. Pi's API types are stable and the runtime doesn't validate types.

## Anti-Patterns That Kill Startup

### 1. Inline Script Templates (Worst Offender)

Large template strings containing Python, bash, or other scripts inside `.ts` files force jiti to parse/transpile massive string literals:

```typescript
// ❌ BAD: 50KB inline Python template makes jiti very slow
const pythonScript = `import os
import subprocess
# ...200 lines of Python...
`;

// ✅ GOOD: Write to temp file in handler, or use direct exec
```

**The fix:** Use `execSync`/`exec` directly instead of generating scripts. Or move scripts to a separate file and write them at runtime.

### 2. Expensive Module-Side Effects

```typescript
// ❌ BAD: Runs during jiti compilation
const tree = execSync('fd ...');
const systemPrompt = buildLongString(tree);
export default function(pi) { ... }

// ✅ GOOD: Defer to handler
export default function(pi) {
  pi.on("before_agent_start", () => {
    const tree = execSync('fd ...');  // runs at runtime, not load time
    ...
  });
}
```

### 3. Deep Directory Trees

Each subdirectory extension (`extensions/foo/`) triggers multiple `fs.statSync` + `readdirSync` + `existsSync` calls during discovery, plus jiti transpiles every file it encounters:

```
extensions/
  heavy-ext/        ← 39 files * jiti cost = ~200ms
    lib/
      util.ts
      parser.ts
      format.ts
      ...
    index.ts
```

**The fix:** Consolidate into fewer files. Merge utility modules into the entry point.

### 4. Importing Heavy Dependencies

jiti re-resolves all `import` statements inside the extension. If your extension imports a heavy package, jiti resolves each transitive dependency:

```typescript
// ❌ BAD: jiti resolves all of glob + picomatch + ... every startup
import { glob } from "glob";
```

**The fix:** Use dynamic `import()` inside handlers, not at module scope.

## Measuring Extension Load Time

Use this one-liner to profile:

```bash
# Patch loader.js to log timing
# (see https://github.com/earendil-works/pi-coding-agent/dist/core/extensions/loader.js)
# Add timing around: const module = await jiti.import(extensionPath, { default: true });
```

Common offenders sorted by real-world measurement:

| Pattern | Typical Cost | Fix |
|---------|-------------|-----|
| Inline Python template | 300-600ms | Use direct exec, no template |
| ts → js conversion | 50-200ms per file | Write in .js |
| Heavy import tree | 50-200ms | Dynamic import |
| 30+ file subdirectory | 100-300ms | Merge files |

## Discovery Cost

Extension discovery reads the entire `extensions/` directory on startup — including files disabled via settings `-` prefix:

```json
{
  "extensions": [
    "-extensions/custom-footer.ts",    // ← still discovered, skipped at load
    "+extensions/answer.ts"
  ]
}
```

**All files in `extensions/`** are discovered by `discoverExtensionsInDir()` regardless of settings. The `-` prefix only prevents the load/run phase.

**Implication:** Removing unused files from `extensions/` speeds up discovery. Archive them to `extensions.disabled/` or just delete.

## Quick Checklist

- [ ] Written in `.js` (not `.ts`)?
- [ ] No large inline templates (> 5KB)?
- [ ] No `execSync`/`readFileSync` at module scope?
- [ ] `import` at module scope minimal?
- [ ] Directory has ≤ 5 files?
- [ ] Unused extensions removed (not just `-` disabled)?
- [ ] No heavy npm dependencies imported eagerly?