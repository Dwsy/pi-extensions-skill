# Pi Extension Architecture (LLM Reference)

> One-page mental model for building pi extensions. Read this before writing code.

## 1. The Extension as a Pure Function

```typescript
export default function (pi: ExtensionAPI): void {
  // PHASE 1: REGISTRATION (load time)
  // Only registration methods work here.
  pi.registerTool({...});
  pi.registerCommand("name", {...});
  pi.on("event", handler);

  // PHASE 2: RUNTIME (event handlers)
  // Action methods only work inside handlers.
}
```

**Critical rule:** `pi.sendMessage()` inside the factory throws. It only works inside event handlers, tools, or commands.

---

## 2. Execution Model: Event-Driven Registry

```
User Input
  │
  ├─► Extension Command? → Execute command handler → END
  │
  ├─► input event → transform/handled?
  │
  ├─► before_agent_start → inject msg / modify system prompt
  │
  ├─► agent_start
  │
  │   ┌── turn_start
  │   │
  │   ├── context → modify messages before LLM call
  │   │
  │   │   LLM decides to call tools
  │   │
  │   ├── tool_execution_start
  │   ├── tool_call → BLOCK? (first blocker wins)
  │   ├── tool executes
  │   ├── tool_result → MODIFY? (chain across extensions)
  │   └── tool_execution_end
  │
  │   └── turn_end
  │
  └─► agent_end
```

---

## 3. ExtensionAPI: Capability Registry

| Method | Phase | Scope |
|--------|-------|-------|
| `pi.on(event, handler)` | Register | Subscribe to lifecycle |
| `pi.registerTool(def)` | Register | Add LLM-callable tool |
| `pi.registerCommand(name, opts)` | Register | Add `/command` |
| `pi.registerShortcut(key, opts)` | Register | Add keybinding |
| `pi.registerFlag(name, opts)` | Register | Add CLI flag |
| `pi.registerMessageRenderer(type, fn)` | Register | Custom TUI rendering |
| `pi.registerProvider(name, config)` | Register | Dynamic model provider |
| `pi.sendMessage(msg, opts)` | Runtime | Inject custom message |
| `pi.sendUserMessage(text, opts)` | Runtime | Inject user message |
| `pi.appendEntry(type, data)` | Runtime | Persist state to session |
| `pi.setSessionName(name)` | Runtime | Rename session |
| `pi.setLabel(id, label)` | Runtime | Bookmark entry |
| `pi.setActiveTools(names)` | Runtime | Toggle available tools |
| `pi.setModel(model)` | Runtime | Switch model |
| `pi.setThinkingLevel(lvl)` | Runtime | Adjust reasoning |
| `pi.exec(cmd, args, opts)` | Both | Shell execution |
| `pi.events` | Runtime | Inter-extension bus |

---

## 4. ExtensionContext: What Handlers Receive

```typescript
interface ExtensionContext {
  ui: ExtensionUIContext;      // Dialogs, widgets, custom components
  hasUI: boolean;              // false in print/JSON mode
  cwd: string;                 // Current working directory
  sessionManager: ReadonlySessionManager;
  modelRegistry: ModelRegistry;
  model: Model | undefined;
  isIdle(): boolean;
  abort(): void;
  hasPendingMessages(): boolean;
  shutdown(): void;
  getContextUsage(): ContextUsage | undefined;
  compact(options?): void;
  getSystemPrompt(): string;
}
```

**Command-only extras:**
```typescript
interface ExtensionCommandContext extends ExtensionContext {
  waitForIdle(): Promise<void>;
  newSession(options?): Promise<{ cancelled }>;
  fork(entryId): Promise<{ cancelled }>;
  navigateTree(targetId, options?): Promise<{ cancelled }>;
  switchSession(path): Promise<{ cancelled }>;
  reload(): Promise<void>;
}
```

---

## 5. Event Semantics (Exact Behavior)

| Event | Can Cancel | Chains | Key Behavior |
|-------|------------|--------|--------------|
| `input` | ✅ via `handled` | Transforms chain | `"handled"` short-circuits |
| `before_agent_start` | ❌ | systemPrompt chains | Messages collected into array |
| `context` | ❌ | messages chain | Each handler sees previous result |
| `tool_call` | ✅ via `block` | Early exit | **First blocker wins** |
| `tool_result` | ❌ | Patches chain | content/details/isError accumulate |
| `user_bash` | ✅ via `result` | Early exit | Return `operations` or `result` |
| `session_before_*` | ✅ via `cancel` | Early exit | Compact/tree/switch/fork |

---

## 6. State Persistence Matrix

| Scope | Technique | Survives Reload | Survives Fork |
|-------|-----------|-----------------|---------------|
| Turn | Local variable | ❌ | ❌ |
| Session | `appendEntry("custom", data)` | ✅ | ✅ |
| LLM Context | `sendMessage({ customType, content, display })` | ✅ | ✅ |
| TUI Only | `registerMessageRenderer` | ✅ | N/A |
| Filesystem | `node:fs` read/write | ✅ | ✅ |

**Reconstruction pattern:**
```typescript
pi.on("session_start", async (_event, ctx) => {
  for (let i = ctx.sessionManager.getEntries().length - 1; i >= 0; i--) {
    const entry = ctx.sessionManager.getEntries()[i];
    if (entry.type === "custom" && entry.customType === "my-ext") {
      myState = entry.data;
      break;
    }
  }
});
```

---

## 7. Multi-Mode Compatibility Map

```
Mode          hasUI   custom()  select/confirm/input/editor  notify/setStatus
────────────  ──────  ────────  ───────────────────────────  ───────────────
Interactive   true    ✅ TUI    ✅ TUI                        ✅ TUI
RPC           true    ❌ undef  ✅ JSON protocol              ✅ JSON events
Print (-p)    false   ❌        ❌                            ❌
JSON          false   ❌        ❌                            ❌
```

**Canonical guard:**
```typescript
const isRPC = process.argv.includes("--mode") && process.argv.includes("rpc");

// TUI-only extension
if (isRPC) return;

// Mixed mode
if (isRPC) {
  const choice = await ctx.ui.select("Pick:", ["A", "B"]);
} else {
  const result = await ctx.ui.custom((tui, theme, kb, done) => {...});
}
```

---

## 8. Custom Provider Lifecycle

```
extension load
  │
  ├─► pi.registerProvider("name", config)
  │    → queued in pendingProviderRegistrations
  │
  ▼
bindCore()
  │
  ├─► flush queue → modelRegistry.registerProvider()
  │
  ▼
session_start / model_select
  → provider is live
```

**Config types:**
- `baseUrl` only → Override existing provider URL
- `baseUrl` + `models` → Define new provider (requires `apiKey` or `oauth`)
- `oauth` → Enables `/login` support
- `streamSimple` → Custom streaming handler

---

## 9. Tool Execution Pipeline

```typescript
pi.registerTool({
  name: "my_tool",
  parameters: Type.Object({...}),

  // Optional: compatibility shim for old session resumes
  prepareArguments(args) {
    return migratedArgs;
  },

  async execute(toolCallId, params, signal, onUpdate, ctx) {
    onUpdate?.({ content: [{ type: "text", text: "50%..." }] });
    return {
      content: [{ type: "text", text: "Done" }],
      details: { key: "value" },  // ← store state here
    };
  },

  // Optional: custom TUI rendering
  renderCall(args, theme, context) { ... },
  renderResult(result, options, theme, context) { ... },
});
```

**Error signaling:** `throw new Error("...")` sets `isError: true`. Returning an object never sets the error flag.

---

## 10. File Mutation Safety (Parallel Tools)

Built-in tools run in parallel by default. If your custom tool edits files, use the mutation queue:

```typescript
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import { resolve } from "node:path";

async execute(_id, params, _signal, _onUpdate, ctx) {
  const absolutePath = resolve(ctx.cwd, params.path);

  return withFileMutationQueue(absolutePath, async () => {
    const current = await readFile(absolutePath, "utf8");
    const next = transform(current);
    await writeFile(absolutePath, next);
    return { content: [{ type: "text", text: "Updated" }] };
  });
}
```

---

## 11. Decision Trees

### Which paradigm?
```
Need LLM to call it? ──────────────────────► Tool
Need user to type /command? ───────────────► Command
Need keyboard shortcut? ───────────────────► Shortcut
Need to react to something happening? ─────► Event handler
Need interactive UI? ──────────────────────► Custom UI component
Need to inject model provider? ────────────► registerProvider
```

### Which state persistence?
```
State should go to LLM? ───────────────────► sendMessage(custom_message)
State is extension-private? ────────────────► appendEntry(custom)
State is user preference across projects? ─► ~/.pi/agent/config file
State is project-local? ───────────────────► .pi/config file
State is temporary cache? ─────────────────► Local variable
```

### Which UI method in which mode?
```
Need blocking dialog (any mode)? ──────────► select / confirm / input / editor
Need rich TUI (interactive only)? ─────────► custom()
Need persistent status line? ──────────────► setStatus
Need widget above/below editor? ───────────► setWidget
Need to replace editor entirely? ──────────► custom() or setEditorComponent
```

---

## 12. Quick Import Map

```typescript
// Core types
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

// Schema
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";  // Use for Google compat

// TUI components
import { Container, Text, SelectList } from "@mariozechner/pi-tui";

// Utilities
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType, isBashToolResult } from "@mariozechner/pi-coding-agent";
```
