# Pi Internals for Extension Authors

> Understanding how pi loads, binds, and executes extensions.

This guide explains the internal machinery of pi's extension system, based on the actual source code (`packages/coding-agent/src/core/extensions/`). You don't need to memorize every detail, but understanding these concepts helps you write more powerful and predictable extensions.

---

## Architecture Overview

The extension system has three core layers:

```
┌─────────────────────────────────────────┐
│  Your Extension (.ts file)              │
│  export default function (pi) { ... }   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Loader (loader.ts)                     │
│  - Discovers extension files            │
│  - Creates ExtensionAPI                 │
│  - Runs your factory function           │
│  - Collects registrations               │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Runner (runner.ts)                     │
│  - Binds actions to runtime             │
│  - Creates ExtensionContext             │
│  - Dispatches events                    │
│  - Executes tools/commands              │
└─────────────────────────────────────────┘
```

---

## The Loader: How Extensions Are Discovered

### Discovery Rules

Pi scans these locations at startup:

1. `~/.pi/agent/extensions/*.ts` — direct files
2. `~/.pi/agent/extensions/*/index.ts` — directories with index
3. `~/.pi/agent/extensions/*/package.json` with `pi.extensions` field
4. `.pi/extensions/` — same rules, project-local
5. Explicit `-e` paths and settings.json entries

### jiti: TypeScript Without Compilation

Pi uses **jiti** to load `.ts` files directly — no `tsc` needed. For the Bun-compiled binary, it uses `virtualModules` so imports like `@mariozechner/pi-coding-agent` resolve to the bundled packages even without `node_modules`.

```typescript
// In Node.js/dev mode: alias resolution
// In Bun binary: virtualModules resolution
const jiti = createJiti(import.meta.url, {
  ...(isBunBinary
    ? { virtualModules: VIRTUAL_MODULES, tryNative: false }
    : { alias: getAliases() }),
});
```

**Practical implication:** You can use any npm package if you add a `package.json` next to your extension and run `npm install` in that directory.

### Two-Pass CLI Parsing

Because extensions can register CLI flags (`pi.registerFlag`), pi does something clever:

1. **First pass:** Parse only `--extension` paths
2. **Preload extensions:** Run their factory functions just to collect flags
3. **Second pass:** Re-parse args with the discovered flags

This is why flags like `--ssh` or `--plan` from extensions work seamlessly with `pi --help`.

### What Happens During `loadExtension()`

```typescript
// 1. Create empty extension object
const extension = {
  path: "...",
  resolvedPath: "...",
  handlers: new Map(),     // event → handler[]
  tools: new Map(),
  commands: new Map(),
  flags: new Map(),
  shortcuts: new Map(),
  messageRenderers: new Map(),
};

// 2. Create ExtensionAPI
const api = createExtensionAPI(extension, runtime, cwd, eventBus);

// 3. Run your factory
await factory(api);
```

At this stage, **action methods are stubs**. Calling `pi.sendMessage()` during your factory function throws `Extension runtime not initialized`. Only registration methods work during load.

---

## The Runtime: Stubs and Deferred Binding

When the loader creates the shared `ExtensionRuntime`, all action methods start as throwing stubs:

```typescript
export function createExtensionRuntime(): ExtensionRuntime {
  const notInitialized = () => {
    throw new Error("Extension runtime not initialized...");
  };

  return {
    sendMessage: notInitialized,
    sendUserMessage: notInitialized,
    appendEntry: notInitialized,
    setSessionName: notInitialized,
    // ... etc
    flagValues: new Map(),
    pendingProviderRegistrations: [],
  };
}
```

This design intentionally separates **registration time** (what your extension declares) from **runtime** (when those declarations actually do something).

### When Stubs Become Real

In `main.ts`, after `createAgentSession()` is called, the `AgentSession` constructor calls `extensionRunner.bindCore(actions, contextActions)`:

```typescript
this.runtime.sendMessage = actions.sendMessage;
this.runtime.sendUserMessage = actions.sendUserMessage;
this.runtime.appendEntry = actions.appendEntry;
// ... all actions replaced
```

From this point on, any call to `pi.sendMessage()` from event handlers or tools works correctly because it delegates to the now-populated runtime.

### Provider Registration Queue

A special case: `pi.registerProvider()` during extension load doesn't immediately register the provider. It gets queued:

```typescript
pi.registerProvider("my-proxy", { ... });
// → runtime.pendingProviderRegistrations.push({ name, config })
```

Then `bindCore()` flushes the queue:

```typescript
for (const { name, config } of this.runtime.pendingProviderRegistrations) {
  this.modelRegistry.registerProvider(name, config);
}
this.runtime.pendingProviderRegistrations = [];
```

This ensures providers are available before the first model resolution happens.

---

## The Runner: Event Dispatch Semantics

`ExtensionRunner` is where all the interesting behavior lives. It maintains:

- `extensions[]` — all loaded extensions
- `runtime` — shared state + actions
- `uiContext` — current UI implementation (TUI or RPC or no-op)
- Various bound functions from `AgentSession`

### Event Handler Chaining

Most events chain across extensions in **load order**. Here are the exact semantics:

#### `emit()` — Generic Events

For events like `session_start`, `agent_end`, `turn_start`:

```typescript
for (const ext of this.extensions) {
  for (const handler of ext.handlers.get(event.type) ?? []) {
    await handler(event, ctx);
  }
}
```

Handlers run sequentially. Errors in one handler don't stop others (they get logged via `emitError`).

#### `emitToolCall()` — Block on First Hit

```typescript
for (const ext of this.extensions) {
  for (const handler of ext.handlers.get("tool_call") ?? []) {
    const result = await handler(event, ctx);
    if (result?.block) {
      return result; // STOP — first blocker wins
    }
  }
}
```

**Key insight:** The first extension to return `{ block: true }` wins. Later extensions don't even see the blocked tool call.

Mutations to `event.input` **do** accumulate:

```typescript
// Extension A
if (isToolCallEventType("bash", event)) {
  event.input.command = `echo "A" && ${event.input.command}`;
}

// Extension B sees the modified command
```

#### `emitToolResult()` — Chain Modifications

```typescript
let currentEvent = { ...event };
let modified = false;

for (const ext of this.extensions) {
  const result = await handler(currentEvent, ctx);
  if (result?.content !== undefined) {
    currentEvent.content = result.content;
    modified = true;
  }
  if (result?.details !== undefined) {
    currentEvent.details = result.details;
    modified = true;
  }
  if (result?.isError !== undefined) {
    currentEvent.isError = result.isError;
    modified = true;
  }
}
```

Each `tool_result` handler sees the **latest version** after previous handlers. This lets multiple extensions collaborate: one pretty-prints JSON, another adds metadata.

#### `emitContext()` — Chain Message Replacements

```typescript
let currentMessages = structuredClone(messages);

for (const ext of this.extensions) {
  const result = await handler({ type: "context", messages: currentMessages }, ctx);
  if (result?.messages) {
    currentMessages = result.messages;
  }
}
```

Extensions can filter, rewrite, or inject messages before they go to the LLM.

#### `emitBeforeAgentStart()` — Chain Both Messages and System Prompt

```typescript
const messages: BeforeAgentStartResult["message"][] = [];
let currentSystemPrompt = systemPrompt;

for (const ext of this.extensions) {
  const result = await handler(event, ctx);
  if (result?.message) messages.push(result.message);
  if (result?.systemPrompt !== undefined) {
    currentSystemPrompt = result.systemPrompt;
  }
}
```

Multiple extensions can each append system prompt modifications. The final prompt sent to the LLM is the chained result.

#### `emitInput()` — Transform or Short-Circuit

```typescript
let currentText = text;
let currentImages = images;

for (const ext of this.extensions) {
  const result = await handler({ ... }, ctx);
  if (result?.action === "handled") return result;
  if (result?.action === "transform") {
    currentText = result.text;
    currentImages = result.images ?? currentImages;
  }
}
```

`"handled"` short-circuits immediately — the first extension to claim the input wins.

---

## Context Objects: When and Where

The runner creates two context objects on demand:

### `ExtensionContext` (all handlers)

```typescript
{
  ui: this.uiContext,           // UI methods
  hasUI: this.hasUI(),          // true in interactive + RPC
  cwd: this.cwd,
  sessionManager: this.sessionManager,  // read-only
  modelRegistry: this.modelRegistry,
  get model() { return getModel(); },
  isIdle: () => this.isIdleFn(),
  abort: () => this.abortFn(),
  hasPendingMessages: () => this.hasPendingMessagesFn(),
  shutdown: () => this.shutdownHandler(),
  getContextUsage: () => this.getContextUsageFn(),
  compact: (options) => this.compactFn(options),
  getSystemPrompt: () => this.getSystemPromptFn(),
}
```

Notice that `model`, `isIdle()`, `getSystemPrompt()` etc. are resolved **at call time**, not cached. This means extensions always see the current state even as the session evolves.

### `ExtensionCommandContext` (commands only)

Adds session control methods that would deadlock if called from inside event handlers:

```typescript
{
  ...ExtensionContext,
  waitForIdle: () => this.waitForIdleFn(),
  newSession: (options) => this.newSessionHandler(options),
  fork: (entryId) => this.forkHandler(entryId),
  navigateTree: (targetId, options) => this.navigateTreeHandler(targetId, options),
  switchSession: (sessionPath) => this.switchSessionHandler(sessionPath),
  reload: () => this.reloadHandler(),
}
```

**Why only commands?** Because calling `ctx.reload()` from inside a `tool_call` handler would try to tear down the runner while the runner is mid-dispatch. Commands run from the interactive TUI loop, outside of event dispatch.

---

## Reload Semantics

What happens when you type `/reload` (or an extension calls `ctx.reload()`)?

1. `session_shutdown` event fires for current extensions
2. `resourceLoader.reload()` rescans all extension files
3. `loadExtensions()` re-runs all factory functions
4. New `ExtensionRunner` is created and bound
5. `session_start { reason: "reload" }` fires
6. `resources_discover { reason: "reload" }` fires

**Important:** Any in-memory variables in your extension are reset. If you had `let connection = null`, it goes back to `null`. Reconstruct state from `sessionManager.getEntries()` or `appendEntry()`.

---

## How Tools Become LLM-Callable

Extensions register tools with `pi.registerTool()`. But the actual `Agent` from `@mariozechner/pi-agent-core` expects a different shape. `AgentSession` bridges this gap via `wrapToolsWithExtensions()` (in `wrapper.ts`):

```typescript
// Simplified
function wrapRegisteredTool(tool: RegisteredTool, runner: ExtensionRunner): Tool {
  return {
    name: tool.definition.name,
    description: tool.definition.description,
    parameters: tool.definition.parameters,
    execute: async (args, signal, onUpdate) => {
      // 1. Emit tool_execution_start
      // 2. Emit tool_call (can block)
      // 3. Run actual execute()
      // 4. Emit tool_result (can modify)
      // 5. Emit tool_execution_end
    },
  };
}
```

This is why `tool_call` and `tool_result` events wrap your tool's `execute()` function. The extension system intercepts at exactly the right layers.

---

## Session Storage Format

Pi stores sessions as **JSONL** files. Each line is a tree node with `id` and `parentId`.

Entry types extensions should know about:

| Type | Purpose | In LLM Context? |
|------|---------|-----------------|
| `message` | User/assistant/toolResult | ✅ Yes |
| `thinking_level_change` | Model thinking level | ✅ Yes (as system context) |
| `model_change` | Active model changed | ✅ Yes |
| `compaction` | Compressed history | ✅ Yes (as summary) |
| `branch_summary` | Tree navigation summary | ❌ No |
| `custom` | Extension private state | ❌ No |
| `custom_message` | Extension message injection | ✅ Yes (converted to user message) |
| `label` | User bookmarks | ❌ No |
| `session_info` | Display name | ❌ No |

Use `pi.appendEntry("my-type", data)` for `custom` entries. Use `pi.sendMessage()` for `custom_message` entries.

---

## Key Takeaways

1. **Registration ≠ Runtime** — Your factory runs at load time to declare things. Actual work happens later in handlers.
2. **Events chain in load order** — Most events accumulate; `tool_call` blocks on first hit; `input` short-circuits on `"handled"`.
3. **Context is lazy** — `ctx.model`, `isIdle()`, etc. resolve at call time. Safe to capture in closures.
4. **Reload resets memory** — Always reconstruct ephemeral state from session entries.
5. **Providers are queued** — `registerProvider()` during load is deferred until `bindCore()`.
6. **Command context is special** — Only commands get `reload()`, `newSession()`, `fork()`, etc.

---

*Next: Advanced Patterns → [07-advanced-patterns.md](07-advanced-patterns.md)*
