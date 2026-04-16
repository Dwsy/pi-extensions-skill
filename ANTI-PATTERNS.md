# Pi Extension Anti-Patterns

> Common mistakes that break extensions, with the correct pattern.

---

## A1. Calling Runtime Actions During Registration

**❌ Wrong:**
```typescript
export default function (pi: ExtensionAPI) {
  // Throws: "Extension runtime not initialized"
  pi.sendMessage({ content: "Hello", display: true });
}
```

**✅ Correct:**
```typescript
export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    pi.sendMessage({ content: "Hello", display: true });
  });
}
```

**Why:** The factory runs at load time before the `AgentSession` exists. Action methods are stubs until `bindCore()` is called.

---

## A2. Using `custom()` in RPC Mode

**❌ Wrong:**
```typescript
pi.on("tool_call", async (event, ctx) => {
  if (!ctx.hasUI) return { block: true };
  // In RPC, custom() returns undefined immediately
  const ok = await ctx.ui.custom<boolean>((tui, theme, kb, done) => {
    // ... confirmation dialog
  });
  if (!ok) return { block: true };
});
```

**✅ Correct:**
```typescript
pi.on("tool_call", async (event, ctx) => {
  if (!ctx.hasUI) return { block: true };
  const choice = await ctx.ui.select("Allow?", ["Allow", "Block"]);
  if (choice !== "Allow") return { block: true };
});
```

**Why:** `ctx.hasUI` is `true` in RPC mode because dialogs work via JSON protocol. But `custom()` requires direct TUI access and returns `undefined` in RPC.

---

## A3. Trusting Return Value to Set `isError`

**❌ Wrong:**
```typescript
async execute() {
  if (failed) {
    return { content: [{ type: "text", text: "Failed" }], isError: true };
  }
}
```

**✅ Correct:**
```typescript
async execute() {
  if (failed) {
    throw new Error("Failed");
  }
}
```

**Why:** Pi only sets `isError: true` when `execute()` throws. Returning `isError: true` in the result object is ignored by the execution wrapper.

---

## A4. Mutating Files Without Mutation Queue

**❌ Wrong:**
```typescript
async execute(_id, params, _signal, _onUpdate, ctx) {
  const current = await readFile(params.path, "utf8");
  const next = transform(current);
  await writeFile(params.path, next);
}
```

**✅ Correct:**
```typescript
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";

async execute(_id, params, _signal, _onUpdate, ctx) {
  const absolutePath = resolve(ctx.cwd, params.path);
  return withFileMutationQueue(absolutePath, async () => {
    const current = await readFile(absolutePath, "utf8");
    const next = transform(current);
    await writeFile(absolutePath, next);
    return { content: [{ type: "text", text: "Done" }] };
  });
}
```

**Why:** Tools run in parallel by default. Without the queue, two tools can read the same file, compute different updates, and the last write wins — losing changes.

---

## A5. Using `rm` in Safety-Critical Extensions

**❌ Wrong:**
```typescript
pi.on("tool_call", async (event) => {
  if (event.toolName === "bash" && event.input.command.includes("rm")) {
    // block it...
  }
});
```

**✅ Correct:**
```typescript
const rmPattern = /(^|[;&|]\s*)(sudo\s+)?rm(\s|$)/;
if (rmPattern.test(cmd)) {
  // block it
}
```

**Why:** `includes("rm")` false-positives on words like `warm`. It also misses `sudo rm`, `&& rm`, `| rm`, and `rm` at the start of a command string.

---

## A6. Forgetting State Reconstruction on Reload

**❌ Wrong:**
```typescript
export default function (pi: ExtensionAPI) {
  let count = 0;  // Reset to 0 on every /reload

  pi.registerCommand("count", {
    handler: async () => {
      count++;
    },
  });
}
```

**✅ Correct:**
```typescript
export default function (pi: ExtensionAPI) {
  let count = 0;

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager.getEntries();
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.type === "custom" && e.customType === "counter") {
        count = (e.data as { count: number }).count;
        break;
      }
    }
  });

  pi.registerCommand("count", {
    handler: async () => {
      count++;
      pi.appendEntry("counter", { count });
    },
  });
}
```

**Why:** `/reload` destroys and recreates the extension instance. Only session entries and the filesystem survive.

---

## A7. Using `Type.Union` for Enums

**❌ Wrong:**
```typescript
parameters: Type.Object({
  action: Type.Union([
    Type.Literal("list"),
    Type.Literal("add"),
  ]),
}),
```

**✅ Correct:**
```typescript
import { StringEnum } from "@mariozechner/pi-ai";

parameters: Type.Object({
  action: StringEnum(["list", "add"] as const),
}),
```

**Why:** Google's API doesn't handle `Type.Union`/`Type.Literal` correctly. `StringEnum` is the portable abstraction.

---

## A8. Blocking `tool_call` with `confirm` in RPC-Unsafe Way

**❌ Wrong:**
```typescript
pi.on("tool_call", async (event, ctx) => {
  if (!ctx.hasUI) return { block: true };
  const ok = await ctx.ui.confirm("Dangerous!", "Allow?");
  if (!ok) return { block: true };
});
```

**✅ Correct:**
```typescript
pi.on("tool_call", async (event, ctx) => {
  if (!ctx.hasUI) return { block: true };
  const choice = await ctx.ui.select(
    "Dangerous!",
    ["Allow", "Block"],
    { timeout: 30000 }
  );
  if (choice !== "Allow") return { block: true };
});
```

**Why:** In RPC mode, `confirm()` works, but if your extension logic depends on rich TUI components inside `tool_call`, use `select`/`confirm`/`input` which have JSON protocol implementations.

---

## A9. Using `@` Prefix Without Stripping

**❌ Wrong:**
```typescript
async execute(_id, params) {
  const data = await readFile(params.path, "utf8");
}
```

**✅ Correct:**
```typescript
async execute(_id, params) {
  const path = params.path.startsWith("@")
    ? params.path.slice(1)
    : params.path;
  const data = await readFile(path, "utf8");
}
```

**Why:** Some models include the `@` prefix in path arguments. Built-in tools strip it; custom tools should too.

---

## A10. Calling Command-Only Methods from Event Handlers

**❌ Wrong:**
```typescript
pi.on("tool_call", async (_event, ctx) => {
  await ctx.reload();  // Type error + potential deadlock
});
```

**✅ Correct:**
```typescript
pi.registerCommand("reload-runtime", {
  handler: async (_args, ctx) => {
    await ctx.reload();
  },
});

// In tool or event handler:
pi.sendUserMessage("/reload-runtime", { deliverAs: "followUp" });
```

**Why:** `reload()`, `newSession()`, `fork()`, etc. are only available in `ExtensionCommandContext`. They can deadlock if called during event dispatch.

---

## A11. Ignoring `signal` in Long-Running Tools

**❌ Wrong:**
```typescript
async execute(_id, params, _signal, _onUpdate) {
  await fetch(params.url);  // Can't be cancelled
}
```

**✅ Correct:**
```typescript
async execute(_id, params, signal, _onUpdate) {
  await fetch(params.url, { signal });
}
```

**Why:** Users press Escape to cancel. Passing `signal` to `fetch()`, stream readers, and timers makes your extension responsive.

---

## A12. Using `details` Inconsistently for State Reconstruction

**❌ Wrong:**
```typescript
async execute() {
  items.push("new");
  return {
    content: [{ type: "text", text: "Added" }],
    // details omitted!
  };
}
```

**✅ Correct:**
```typescript
async execute() {
  items.push("new");
  return {
    content: [{ type: "text", text: "Added" }],
    details: { items: [...items] },
  };
}
```

**Why:** `sessionManager.getBranch()` can read `message.details` from toolResult entries to reconstruct state across reloads and forks.

---

## A13. Loading Extensions from Relative Paths Without Resolution

**❌ Wrong:**
```typescript
// In a package or nested directory
import { myHelper } from "./utils.js";  // May fail depending on cwd
```

**✅ Correct:**
```typescript
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const utilsPath = join(__dirname, "utils.js");
```

**Why:** jiti resolves imports relative to the extension file, but dynamic imports or file reads need absolute paths.

---

## A14. Using `renderShell: "self"` Unnecessarily

**❌ Wrong:**
```typescript
pi.registerTool({
  name: "simple",
  renderShell: "self",
  renderCall() {
    return new Text("Simple", 0, 0);
  },
});
```

**✅ Correct:**
```typescript
pi.registerTool({
  name: "simple",
  renderCall(args, theme) {
    return new Text(theme.fg("accent", args.name), 0, 0);
  },
});
```

**Why:** `renderShell: "self"` opts out of the default `Box` wrapper. You must then handle padding, background, and framing yourself. Only use it when the default box gets in the way.

---

## A15. Not Checking Model Availability Before Switching

**❌ Wrong:**
```typescript
pi.registerCommand("fast", {
  handler: async (_args, ctx) => {
    const model = ctx.modelRegistry.find("anthropic", "claude-haiku-4-5");
    await pi.setModel(model!);  // May fail silently
  },
});
```

**✅ Correct:**
```typescript
pi.registerCommand("fast", {
  handler: async (_args, ctx) => {
    const model = ctx.modelRegistry.find("anthropic", "claude-haiku-4-5");
    if (!model) {
      ctx.ui.notify("Model not found", "error");
      return;
    }
    const ok = await pi.setModel(model);
    if (!ok) {
      ctx.ui.notify("No API key for this model", "error");
    }
  },
});
```

**Why:** `setModel()` returns `false` if no API key is available. Always check the return value.
