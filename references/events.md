# Pi Extensions Event Reference

Payloads and usage for common events (narrative).

> ⚠️ **Pi 1.5.0 has 42 events**; this file covers about 20. For the complete list, handler result types and per-event coverage see [`api-surface-1.5.md`](api-surface-1.5.md) §5. The authority is the `ExtensionEvent` union in `dist/core/extensions/types.d.ts`.
> Two fictional events previously documented here, `session_switch` / `session_fork`, were removed: they do not exist in 1.5.0 and a subscription would never fire.

## Lifecycle Overview

```
pi starts
  │
  └─► session_start
      │
      ▼
user sends prompt ─────────────────────────────────────────┐
  │                                                        │
  ├─► (extension commands checked first, bypass if found)  │
  ├─► input (can intercept, transform, or handle)          │
  ├─► (skill/template expansion if not handled)            │
  ├─► before_agent_start (can inject message, modify system prompt)
  ├─► agent_start                                          │
  │                                                        │
  │   ┌─── turn (repeats while LLM calls tools) ───┐       │
  │   │                                            │       │
  │   ├─► turn_start                               │       │
  │   ├─► context (can modify messages)            │       │
  │   │                                            │       │
  │   │   LLM responds, may call tools:            │       │
  │   │     ├─► tool_call (can block)              │       │
  │   │     │   tool executes                      │       │
  │   │     └─► tool_result (can modify)           │       │
  │   │                                            │       │
  │   └─► turn_end                                 │       │
  │                                                        │
  └─► agent_end                                            │
                                                           │
user sends another prompt ◄────────────────────────────────┘

/new or /resume
  ├─► session_before_switch / session_switch

/fork
  ├─► session_before_fork / session_fork

/compact
  ├─► session_before_compact / session_compact

/tree
  ├─► session_before_tree / session_tree

/model or Ctrl+P
  └─► model_select

exit
  └─► session_shutdown
```

## Session Events

### session_start

Fires when a session is loaded.

```typescript
pi.on("session_start", async (_event, ctx) => {
  ctx.ui.notify("Extension loaded!", "info");
});
```

### session_before_switch

Fires before switching sessions (`/new`, `/resume`). **1.5.0 has no `session_switch` event.**

```typescript
pi.on("session_before_switch", async (event, ctx) => {
  // event.reason: "new" | "resume"
  // event.targetSessionFile: target session file (resume only)
  return { cancel: true }; // cancel the switch
});
```

> `pi.on` returns an unsubscribe function `() => void`; long-lived handlers should call it on shutdown.

### session_before_fork

Fires before forking a session (`/fork`). **1.5.0 has no `session_fork` event.**

```typescript
pi.on("session_before_fork", async (event, ctx) => {
  // event.entryId: entry ID at the fork point
  return { cancel: true }; // cancel
  // or { skipConversationRestore: true } // do not restore the conversation
});
```

### session_before_compact / session_compact

Fires when the session is compacted.

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, signal } = event;
  return { cancel: true }; // cancel
  // or supply a custom summary
  return { compaction: { summary: "...", firstKeptEntryId, tokensBefore } };
});
```

### session_before_tree / session_tree

Fires on tree navigation (`/tree`).

```typescript
pi.on("session_before_tree", async (event, ctx) => {
  return { cancel: true }; // cancel
  // or supply a custom summary
  return { summary: { summary: "...", details: {} } };
});
```

### session_shutdown

Fires on exit (Ctrl+C, Ctrl+D, SIGTERM).

```typescript
pi.on("session_shutdown", async (_event, ctx) => {
  // clean up, save state
});
```

## Agent Events

### before_agent_start

Fires after the user submits a prompt and before the agent loop starts.

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  return {
    message: { customType: "my-ext", content: "...", display: true },
    systemPrompt: event.systemPrompt + "\nExtra instructions...",
  };
});
```

### agent_start / agent_end

Fires once per user prompt.

```typescript
pi.on("agent_start", async (_event, ctx) => {});
pi.on("agent_end", async (event, ctx) => {
  // event.messages: messages for this prompt
});
```

### turn_start / turn_end

Fires on each LLM response + tool call.

```typescript
pi.on("turn_start", async (event, ctx) => {
  // event.turnIndex, event.timestamp
});
pi.on("turn_end", async (event, ctx) => {
  // event.turnIndex, event.message, event.toolResults
});
```

### context

Fires before each LLM call; messages can be modified.

```typescript
pi.on("context", async (event, ctx) => {
  const filtered = event.messages.filter(m => !shouldPrune(m));
  return { messages: filtered };
});
```

## Tool Events

### tool_call

Fires before tool execution; **can be blocked**.

```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

pi.on("tool_call", async (event, ctx) => {
  // built-in tools
  if (isToolCallEventType("bash", event)) {
    // event.input: { command: string; timeout?: number }
  }

  if (isToolCallEventType("read", event)) {
    // event.input: { path: string; offset?: number; limit?: number }
  }

  // block
  return { block: true, reason: "Reason" };
});
```

### tool_result

Fires after tool execution; **the result can be modified**.

```typescript
import { isBashToolResult } from "@earendil-works/pi-coding-agent";

pi.on("tool_result", async (event, ctx) => {
  if (isBashToolResult(event)) {
    // event.details: BashToolDetails
  }

  // modify the result
  return { content: [...], details: {...}, isError: false };
});
```

## Input Events

### input

Fires on user input, before skill/template expansion.

```typescript
pi.on("input", async (event, ctx) => {
  // event.text: raw input
  // event.images: attached images
  // event.source: "interactive" | "rpc" | "extension"

  // transform
  if (event.text.startsWith("?quick ")) {
    return { action: "transform", text: `Answer briefly: ${event.text.slice(7)}` };
  }

  // handle (skip the agent)
  if (event.text === "ping") {
    ctx.ui.notify("pong", "info");
    return { action: "handled" };
  }

  // continue
  return { action: "continue" };
});
```

**Result types:**
- `continue` — keep processing (default)
- `transform` — continue with modified text
- `handled` — skip the agent

## Model Events

### model_select

Fires when the model changes.

```typescript
pi.on("model_select", async (event, ctx) => {
  // event.model: new model
  // event.previousModel: previous model
  // event.source: "set" | "cycle" | "restore"
});
```

## User Bash Events

### user_bash

Fires when the user runs a `!` or `!!` command.

```typescript
pi.on("user_bash", (event, ctx) => {
  // event.command: command
  // event.excludeFromContext: true when the !! prefix is used
  // event.cwd: working directory

  // provide custom operations
  return { operations: remoteBashOps };

  // or return a full result
  return { result: { output: "...", exitCode: 0, ... } };
});
```
