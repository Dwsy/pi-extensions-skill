# Pi Extension Pattern Library

> Copy-paste recipes organized by intent. Every pattern includes exact imports and minimal surrounding code.

---

## Quick Reference Index

### By Use Case

| Want to... | Pattern | Key APIs |
|------------|---------|----------|
| **Create first extension** | [P1](#p1-minimal-extension) | `pi.registerCommand` |
| **Add LLM-callable tool** | [P2](#p2-tool-registration) + [P3](#p3-tool-with-streaming-progress) | `pi.registerTool` + `onPartialResult` |
| **Override read/grep/bash** | [P4](#p4-override-built-in-tool) | Same name → wrap |
| **Add fuzzy file search** | [P25](#p25-tool-enhancement-with-external-engine) + [P29](#p29-editor-autocomplete-integration) | External engine + autocomplete |
| **Build TUI dialog** | [P12](#p12-custom-ui-select-dialog) + [P13](#p13-custom-ui-timer-based-confirmation) | `ctx.ui.select/confirm` |
| **Show status widget** | [P14](#p14-custom-ui-widget) | `ctx.ui.setWidget` |
| **Render HTML/SVG widget** | [P42](#p42-widget-streaming-with-morphdom) | `glimpseui` + `morphdom` |
| **Persist state** | [P15](#p15-state-persistence) → turn | `pi.appendEntry` |
| | [P16](#p16-branch-resilient-state) → survives checkout | `session_before_tree` |
| | [P35](#p35-session-entry-persistence) → survives compaction | `custom_message` entries |
| | [P32](#p32-type-safe-config-store) → survives restart | JSON + Zod |
| **Gate dangerous commands** | [P8](#p8-event-block-dangerous-bash) + [P34](#p34-command-rewriting-pipeline) | `tool_call` + rewrite rules |
| **Modify tool results** | [P9](#p9-event-modify-tool-result) + [P31](#p31-tool-result-interception) | `tool_result` + compaction |
| **Inject system prompt** | [P10](#p10-event-inject-system-prompt) | `before_agent_start` |
| **Spawn subagents** | [P39](#p39-terminal-multiplexer-abstraction) + [P40](#p40-subagent-orchestration) | cmux/tmux/zellij + monitoring |
| **Run experiment loop** | [P41](#p41-experiment-loop-infrastructure) | `run_experiment` + confidence |
| **Add user commands** | [P6](#p6-command-registration) + [P7](#p7-command-with-autocomplete) | `pi.registerCommand` |
| | [P23](#p23-model-switch-on-command) | `pi.setModel` |
| | [P26](#p26-feature-flags--runtime-state) | TUI toggle panel |
| **Custom model provider** | [P19](#p19-dynamic-provider-registration) + [P20](#p20-oauth-provider) | `pi.registerProvider` |
| **Rich message display** | [P18](#p18-custom-message-renderer) + [P43](#p43-custom-message-renderer) | `pi.registerMessageRenderer` |
| **Context navigation** | [P35](#p35-session-entry-persistence) → [P36](#p36-deferred-execution-pattern) → [P38](#p38-auto-milestone-detection) | `sessionManager` + deferred exec |

### By Complexity

| ⭐ Basic | ⭐⭐ Intermediate | ⭐⭐⭐ Advanced | ⭐⭐⭐⭐ Expert | ⭐⭐⭐⭐⭐ Master |
|----------|-------------------|---------------|---------------|----------------|
| P1 | P3, P7, P9, P12 | P14, P16, P24 | P19, P25, P34 | P35, P36, P41 |
| P2 | P10, P11, P13 | P26, P30, P32 | P27, P28, P38 | P40, P43 |
| P6 | P15, P18 | P37 | P29, P33, P39 | |
| | P21 | | P20, P22, P42 | |

### By Source Extension

| Extension | Patterns |
|-----------|----------|
| **Core/Pi** | P1-P24 |
| **pi-fff** | P25-P29 |
| **pi-tool-display** | P30 |
| **pi-rtk-optimizer** | P31-P34 |
| **pi-context** | P35-P38 |
| **pi-interactive-subagents** | P39-P40, P43 |
| **pi-autoresearch** | P41 |
| **pi-generative-ui** | P42 |

---

## Table of Contents

**Foundation (⭐)**
- [P1. Minimal Extension](#p1-minimal-extension)
- [P2. Tool Registration](#p2-tool-registration)

**Tools (⭐⭐-⭐⭐⭐⭐⭐)**
- [P3. Tool with Streaming Progress](#p3-tool-with-streaming-progress)
- [P4. Override Built-in Tool](#p4-override-built-in-tool)
- [P5. Safe File Mutation](#p5-safe-file-mutation)
- [P25. Tool Enhancement with External Engine](#p25-tool-enhancement-with-external-engine)
- [P31. Tool Result Interception](#p31-tool-result-interception)
- [P41. Experiment Loop Infrastructure](#p41-experiment-loop-infrastructure)

**Commands (⭐-⭐⭐⭐⭐)**
- [P6. Command Registration](#p6-command-registration)
- [P7. Command with Autocomplete](#p7-command-with-autocomplete)
- [P23. Model Switch on Command](#p23-model-switch-on-command)
- [P26. Feature Flags & Runtime State](#p26-feature-flags--runtime-state)
- [P37. Conditional Activation](#p37-conditional-activation)

**Events & Hooks (⭐⭐-⭐⭐⭐⭐⭐)**
- [P8. Event: Block Dangerous Bash](#p8-event-block-dangerous-bash)
- [P9. Event: Modify Tool Result](#p9-event-modify-tool-result)
- [P10. Event: Inject System Prompt](#p10-event-inject-system-prompt)
- [P11. Event: Transform User Input](#p11-event-transform-user-input)
- [P34. Command Rewriting Pipeline](#p34-command-rewriting-pipeline)
- [P36. Deferred Execution Pattern](#p36-deferred-execution-pattern)
- [P22. Compaction Hook](#p22-compaction-hook)

**UI Components (⭐⭐-⭐⭐⭐⭐⭐)**
- [P12. Custom UI: Select Dialog](#p12-custom-ui-select-dialog)
- [P13. Custom UI: Timer-based Confirmation](#p13-custom-ui-timer-based-confirmation)
- [P14. Custom UI: Widget](#p14-custom-ui-widget)
- [P42. Widget Streaming with Morphdom](#p42-widget-streaming-with-morphdom)

**State & Config (⭐⭐-⭐⭐⭐)**
- [P15. State Persistence](#p15-state-persistence)
- [P16. Branch-Resilient State](#p16-branch-resilient-state)
- [P24. Load State from Session](#p24-load-state-from-session)
- [P30. Pure Config Extension](#p30-pure-config-extension)
- [P32. Type-Safe Config Store](#p32-type-safe-config-store)
- [P35. Session Entry Persistence](#p35-session-entry-persistence)

**Editor & Search (⭐⭐⭐⭐)**
- [P27. Fuzzy Path Resolution](#p27-fuzzy-path-resolution)
- [P28. Cursor-based Pagination](#p28-cursor-based-pagination)
- [P29. Editor Autocomplete Integration](#p29-editor-autocomplete-integration)

**Integration (⭐⭐-⭐⭐⭐⭐)**
- [P17. Inter-Extension Communication](#p17-inter-extension-communication)
- [P19. Dynamic Provider Registration](#p19-dynamic-provider-registration)
- [P20. OAuth Provider](#p20-oauth-provider)
- [P39. Terminal Multiplexer Abstraction](#p39-terminal-multiplexer-abstraction)
- [P40. Subagent Orchestration](#p40-subagent-orchestration)

**Context Management (⭐⭐⭐⭐-⭐⭐⭐⭐⭐)**
- [P38. Auto-Milestone Detection](#p38-auto-milestone-detection)

**Rendering (⭐⭐-⭐⭐⭐⭐⭐)**
- [P18. Custom Message Renderer](#p18-custom-message-renderer)
- [P43. Custom Message Renderer](#p43-custom-message-renderer)

**Utilities & Helpers**
- [P21. RPC-Safe Extension](#p21-rpc-safe-extension)
- [P33. Bounded Notice Tracker](#p33-bounded-notice-tracker)

---

## P1. Minimal Extension

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("ping", {
    description: "Ping the extension",
    handler: async (_args, ctx) => {
      ctx.ui.notify("pong", "info");
    },
  });
}
```

---

## P2. Tool Registration

```typescript
import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "greet",
    label: "Greet",
    description: "Greet someone by name",
    parameters: Type.Object({
      name: Type.String({ description: "Name to greet" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return {
        content: [{ type: "text", text: `Hello, ${params.name}!` }],
        details: {},
      };
    },
  });
}
```

---

## P3. Tool with Streaming Progress

```typescript
pi.registerTool({
  name: "slow_task",
  label: "Slow Task",
  parameters: Type.Object({ steps: Type.Number({ default: 5 }) }),
  async execute(_id, params, signal, onUpdate) {
    for (let i = 1; i <= params.steps; i++) {
      if (signal?.aborted) {
        return { content: [{ type: "text", text: "Aborted" }] };
      }
      onUpdate?.({
        content: [{ type: "text", text: `Step ${i}/${params.steps}...` }],
        details: { progress: i, total: params.steps },
      });
      await new Promise((r) => setTimeout(r, 500));
    }
    return {
      content: [{ type: "text", text: "Done" }],
      details: { completed: true },
    };
  },
});
```

---

## P4. Override Built-in Tool

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "read",  // Same name = override
    label: "Read",
    description: "Read with access logging",
    parameters: Type.Object({ path: Type.String() }),
    async execute(_id, params, signal, onUpdate, ctx) {
      console.log(`[AUDIT] read ${params.path}`);
      // Delegate to built-in read logic or reimplement
      const { readFileSync } = await import("node:fs");
      const text = readFileSync(params.path, "utf8");
      return { content: [{ type: "text", text }] };
    },
  });
}
```

**Note:** Omit `renderCall`/`renderResult` to inherit built-in renderers automatically.

---

## P5. Safe File Mutation

```typescript
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { resolve, dirname } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

async execute(_id, params, _signal, _onUpdate, ctx) {
  const absolutePath = resolve(ctx.cwd, params.path);

  return withFileMutationQueue(absolutePath, async () => {
    await mkdir(dirname(absolutePath), { recursive: true });
    const current = await readFile(absolutePath, "utf8");
    const next = current.replace(params.oldText, params.newText);
    await writeFile(absolutePath, next, "utf8");
    return { content: [{ type: "text", text: `Updated ${params.path}` }] };
  });
}
```

---

## P6. Command Registration

```typescript
pi.registerCommand("deploy", {
  description: "Deploy to environment",
  handler: async (args, ctx) => {
    const env = args.trim() || "staging";
    ctx.ui.notify(`Deploying to ${env}...`, "info");
  },
});
```

---

## P7. Command with Autocomplete

```typescript
import type { AutocompleteItem } from "@earendil-works/pi-tui";

pi.registerCommand("env", {
  description: "Select environment",
  getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
    const envs = ["dev", "staging", "prod"];
    const items = envs.map((e) => ({ value: e, label: e }));
    const filtered = items.filter((i) => i.value.startsWith(prefix));
    return filtered.length > 0 ? filtered : null;
  },
  handler: async (args, ctx) => {
    ctx.ui.notify(`Selected: ${args || "dev"}`, "info");
  },
});
```

---

## P8. Event: Block Dangerous Bash

```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

pi.on("tool_call", async (event, ctx) => {
  if (!isToolCallEventType("bash", event)) return;
  const cmd = event.input.command;

  if (/\brm\b/.test(cmd) && !/(\/tmp\/|\/var\/cache\/)/.test(cmd)) {
    if (!ctx.hasUI) {
      return { block: true, reason: "Dangerous command blocked (no UI)" };
    }
    const choice = await ctx.ui.select(
      `⚠️ rm detected: ${cmd}`,
      ["Allow", "Block"],
      { timeout: 30000 }
    );
    if (choice !== "Allow") {
      return { block: true, reason: "Blocked by user", suggestion: "Use trash instead" };
    }
  }
});
```

---

## P9. Event: Modify Tool Result

```typescript
import { isReadToolResult } from "@earendil-works/pi-coding-agent";

pi.on("tool_result", async (event) => {
  if (!isReadToolResult(event)) return;
  if (!event.input.path.endsWith(".json")) return;

  const text = event.content.find((c) => c.type === "text")?.text;
  if (!text) return;

  try {
    const pretty = JSON.stringify(JSON.parse(text), null, 2);
    return { content: [{ type: "text", text: pretty }] };
  } catch {
    return;
  }
});
```

---

## P10. Event: Inject System Prompt

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  return {
    systemPrompt: event.systemPrompt + "\n\nAlways respond in Chinese.",
  };
});
```

---

## P11. Event: Transform User Input

```typescript
pi.on("input", async (event) => {
  if (event.text.startsWith("?quick ")) {
    return {
      action: "transform",
      text: `Respond briefly: ${event.text.slice(7)}`,
    };
  }
  if (event.text === "ping") {
    // handled = skip agent entirely
    return { action: "handled" };
  }
  return { action: "continue" };
});
```

---

## P12. Custom UI: Select Dialog

```typescript
import { Container, Text, SelectList } from "@earendil-works/pi-tui";

const choice = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
  const container = new Container();
  container.addChild(new Text(theme.fg("accent", "Select Option")));

  const items = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ];

  const list = new SelectList(items, 5, {
    selectedText: (t) => theme.fg("accent", t),
  });
  list.onSelect = (item) => done(item.value);
  list.onCancel = () => done(null);

  container.addChild(list);

  return {
    render(width) {
      return container.render(width);
    },
    invalidate() {
      container.invalidate();
    },
    handleInput(data) {
      list.handleInput(data);
      tui.requestRender();
    },
  };
});
```

---

## P13. Custom UI: Timer-based Confirmation

```typescript
const confirmed = await ctx.ui.confirm(
  "Timed Confirmation",
  "This dialog will auto-cancel in 5 seconds. Confirm?",
  { timeout: 5000 }
);

if (confirmed) {
  // User confirmed
} else {
  // User cancelled or timed out
}
```

---

## P14. Custom UI: Widget

```typescript
// String widget (works in RPC)
ctx.ui.setWidget("status", [
  ctx.ui.theme.fg("accent", "Processing..."),
  ctx.ui.theme.fg("dim", "Step 2 of 5"),
]);

// Component widget (interactive only)
ctx.ui.setWidget("dynamic", (tui, theme) => ({
  render(w) {
    return [theme.fg("accent", `Time: ${Date.now()}`)];
  },
  invalidate() {},
}));
```

---

## P15. State Persistence

```typescript
// Save
pi.appendEntry("my-ext", { count: 42, lastRun: Date.now() });

// Load
pi.on("session_start", async (_event, ctx) => {
  const entries = ctx.sessionManager.getEntries();
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.type === "custom" && e.customType === "my-ext") {
      myState = e.data as MyState;
      break;
    }
  }
});
```

---

## P16. Branch-Resilient State

```typescript
pi.on("session_before_tree", async () => {
  pi.appendEntry("my-ext", myState);
});

pi.on("session_tree", async (_event, ctx) => {
  const entries = ctx.sessionManager.getEntries();
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.type === "custom" && e.customType === "my-ext") {
      myState = e.data;
      break;
    }
  }
});
```

---

## P17. Inter-Extension Communication

```typescript
// Extension A
pi.events.emit("build:complete", { outputPath: "/tmp/build" });

// Extension B
pi.events.on("build:complete", (data) => {
  const { outputPath } = data as { outputPath: string };
  console.log(`Build ready at ${outputPath}`);
});
```

---

## P18. Custom Message Renderer

```typescript
import { Text } from "@earendil-works/pi-tui";

pi.registerMessageRenderer("my-ext", (message, { expanded }, theme) => {
  let text = theme.fg("accent", `[${message.customType}] `) + message.content;
  if (expanded && message.details) {
    text += "\n" + theme.fg("dim", JSON.stringify(message.details, null, 2));
  }
  return new Text(text, 0, 0);
});
```

Send messages that use this renderer:

```typescript
pi.sendMessage({
  customType: "my-ext",
  content: "Status update",
  display: true,
  details: { progress: 50 },
});
```

---

## P19. Dynamic Provider Registration

```typescript
pi.registerProvider("my-proxy", {
  baseUrl: "https://proxy.example.com/v1",
  apiKey: "PROXY_API_KEY",  // env var name or literal
  api: "openai-responses",
  authHeader: true,
  models: [
    {
      id: "claude-sonnet-4-5",
      name: "Claude Sonnet 4.5 (Proxy)",
      reasoning: true,
      input: ["text", "image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 200000,
      maxTokens: 16384,
    },
  ],
});
```

---

## P20. OAuth Provider

```typescript
pi.registerProvider("corporate-ai", {
  baseUrl: "https://ai.corp.com",
  api: "openai-responses",
  models: [...],
  oauth: {
    name: "Corporate AI (SSO)",
    async login(callbacks) {
      callbacks.onAuth({ url: "https://sso.corp.com/..." });
      const code = await callbacks.onPrompt({ message: "Enter code:" });
      return { refresh: code, access: code, expires: Date.now() + 3600000 };
    },
    async refreshToken(credentials) {
      return credentials;  // or fetch new token
    },
    getApiKey(credentials) {
      return credentials.access;
    },
  },
});
```

---

## P21. RPC-Safe Extension

```typescript
export default function (pi: ExtensionAPI) {
  const isRPC = process.argv.includes("--mode") && process.argv.includes("rpc");

  // Pure TUI extension: skip in RPC
  if (isRPC) return;

  // Mixed extension: use dialogs instead of custom() in RPC
  pi.registerCommand("my-cmd", {
    handler: async (_args, ctx) => {
      if (isRPC) {
        const choice = await ctx.ui.select("Pick:", ["A", "B"]);
        // ...
      } else {
        const result = await ctx.ui.custom((tui, theme, kb, done) => {
          // rich TUI
        });
        // ...
      }
    },
  });
}
```

---

## P22. Compaction Hook

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  // Cancel compaction
  // return { cancel: true };

  // Or customize
  const { compact } = await import("@earendil-works/pi-coding-agent");
  const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model!);
  if (!auth.ok || !auth.apiKey) return;

  const customInstructions = "Preserve all deployment context.";
  const result = await compact(
    event.preparation,
    ctx.model!,
    auth.apiKey,
    customInstructions,
    event.signal
  );

  return { compaction: result };
});
```

---

## P23. Model Switch on Command

```typescript
pi.registerCommand("fast", {
  description: "Switch to fast model",
  handler: async (_args, ctx) => {
    const fast = ctx.modelRegistry.find("anthropic", "claude-haiku-4-5");
    if (!fast) {
      ctx.ui.notify("Fast model not available", "error");
      return;
    }
    const ok = await pi.setModel(fast);
    ctx.ui.notify(ok ? "Switched to fast model" : "No API key", ok ? "success" : "error");
  },
});
```

---

## P24. Load State from Session

```typescript
interface MyState {
  version: number;
  items: string[];
}

function loadState(ctx: ExtensionContext): MyState | null {
  const entries = ctx.sessionManager.getBranch();
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.type === "message" && e.message.role === "toolResult" && e.message.toolName === "my_tool") {
      return (e.message.details as { state?: MyState })?.state ?? null;
    }
    if (e.type === "custom" && e.customType === "my-state") {
      return e.data as MyState;
    }
  }
  return null;
}

pi.on("session_start", async (_event, ctx) => {
  const state = loadState(ctx);
  if (state) {
    ctx.ui.notify(`Restored ${state.items.length} items`, "info");
  }
});
```

---

## P25. Tool Enhancement with External Engine

Enhance built-in tools by wrapping them with an external search/indexing engine (like pi-fff uses @ff-labs/fff-node).

### Architecture

```
User Tool Call
    │
    ▼
Extension Tool Handler
    │
    ├─► Path Resolution (fuzzy → exact)
    │
    ├─► External Engine Call
    │
    └─► Fallback to Built-in Tool
    │
    ▼
Result with Metadata
```

### Implementation

```typescript
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { createReadTool, createGrepTool } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { FileFinder } from "@ff-labs/fff-node"; // External engine example

interface EngineRuntime {
  resolvePath(query: string): Promise<{ absolutePath: string; relativePath: string } | null>;
  grepSearch(params: { pattern: string; path?: string }): Promise<{ items: any[]; formatted: string }>;
  warm(): Promise<void>;
  dispose(): void;
}

export default function (pi: ExtensionAPI) {
  let runtime: EngineRuntime | null = null;

  // Initialize engine on session start
  pi.on("session_start", async (_event, ctx) => {
    runtime?.dispose();
    runtime = await initializeEngine(ctx.cwd);
    await runtime.warm();
  });

  pi.on("session_shutdown", async () => {
    runtime?.dispose();
    runtime = null;
  });

  // Read tool with fuzzy path resolution
  const originalRead = createReadTool(process.cwd());
  pi.registerTool({
    name: "read",
    label: "Read",
    description: "Read file with fuzzy path resolution",
    parameters: Type.Object({
      path: Type.String(),
      offset: Type.Optional(Type.Number()),
      limit: Type.Optional(Type.Number()),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      if (!runtime) {
        return originalRead.execute(toolCallId, params, signal, onUpdate);
      }

      // Resolve fuzzy path to exact path
      const resolved = await runtime.resolvePath(params.path);
      if (!resolved) {
        return originalRead.execute(toolCallId, params, signal, onUpdate);
      }

      // Call built-in read with resolved path
      return originalRead.execute(
        toolCallId,
        { ...params, path: resolved.absolutePath },
        signal,
        onUpdate
      );
    },
  });

  // Grep tool with external engine
  const originalGrep = createGrepTool(process.cwd());
  pi.registerTool({
    name: "grep",
    label: "Grep",
    description: "Search with external engine and fallback",
    parameters: Type.Object({
      pattern: Type.String(),
      path: Type.Optional(Type.String()),
      glob: Type.Optional(Type.String()),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      if (!runtime) {
        return originalGrep.execute(toolCallId, params, signal, onUpdate);
      }

      // Try external engine
      const result = await runtime.grepSearch({
        pattern: params.pattern,
        path: params.path,
      });

      if (result.items.length > 0) {
        return {
          content: [{ type: "text", text: result.formatted }],
          details: { engine: "external", count: result.items.length },
        };
      }

      // Fallback to built-in
      return originalGrep.execute(toolCallId, params, signal, onUpdate);
    },
  });
}

async function initializeEngine(cwd: string): Promise<EngineRuntime> {
  // External engine initialization
  const finder = FileFinder.create({ basePath: cwd });

  return {
    async resolvePath(query: string) {
      const result = await finder.fileSearch(query, { pageSize: 1 });
      if (result.items.length === 0) return null;
      return {
        absolutePath: result.items[0].path,
        relativePath: result.items[0].relativePath,
      };
    },
    async grepSearch(params: { pattern: string; path?: string }) {
      const result = await finder.grep(params.pattern, {
        constraints: params.path,
      });
      return {
        items: result.items,
        formatted: formatGrepResults(result.items),
      };
    },
    async warm() {
      await finder.waitForScan(1000);
    },
    dispose() {
      finder.destroy();
    },
  };
}

function formatGrepResults(items: any[]): string {
  return items.map((i) => `${i.relativePath}:${i.lineNumber}: ${i.lineContent}`).join("\n");
}
```

### Key Principles

1. **Always fallback** - External engine failure should not break tool
2. **Lazy initialization** - Warm engine asynchronously after session start
3. **Dispose on shutdown** - Clean up external resources
4. **Preserve tool contract** - Return same shape as built-in tool

---

## P26. Feature Flags & Runtime State

Implement feature toggles to enable/disable extension functionality dynamically.

### State Management

```typescript
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { Result } from "better-result";

type FeatureKey = "autocomplete" | "toolEnhancements" | "statusUI";

const FEATURE_DEFINITIONS = [
  { id: "autocomplete", label: "Autocomplete", description: "Editor path completion" },
  { id: "toolEnhancements", label: "Tool Enhancements", description: "Enhanced read/grep tools" },
  { id: "statusUI", label: "Status UI", description: "Show startup notifications" },
] as const;

const GLOBAL_FEATURES_PATH = join(getAgentDir(), "extensions", "my-ext.json");

class FeatureStateManager {
  private enabledFeatures = new Set<FeatureKey>(["autocomplete", "toolEnhancements", "statusUI"]);

  async load(): Promise<void> {
    const result = await Result.tryPromise({
      try: () => readFile(GLOBAL_FEATURES_PATH, "utf8"),
      catch: () => null,
    });

    if (result.isOk() && result.value) {
      try {
        const parsed = JSON.parse(result.value);
        this.enabledFeatures = new Set(parsed.enabledFeatures ?? []);
      } catch {
        // Keep defaults
      }
    }
  }

  async save(): Promise<void> {
    await mkdir(join(getAgentDir(), "extensions"), { recursive: true });
    await writeFile(
      GLOBAL_FEATURES_PATH,
      JSON.stringify({ enabledFeatures: Array.from(this.enabledFeatures) }, null, 2)
    );
  }

  isEnabled(feature: FeatureKey): boolean {
    return this.enabledFeatures.has(feature);
  }

  setEnabled(feature: FeatureKey, enabled: boolean): void {
    if (enabled) this.enabledFeatures.add(feature);
    else this.enabledFeatures.delete(feature);
  }

  getAll(): Array<{ id: FeatureKey; label: string; description: string; enabled: boolean }> {
    return FEATURE_DEFINITIONS.map((f) => ({
      ...f,
      enabled: this.enabledFeatures.has(f.id),
    }));
  }
}
```

### TUI Feature Toggle Command

```typescript
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";

pi.registerCommand("features", {
  description: "Toggle extension features",
  handler: async (_args, ctx) => {
    const manager = new FeatureStateManager();
    await manager.load();

    await ctx.ui.custom((tui, theme, _kb, done) => {
      let selectedIndex = 0;
      const draft = new Set<FeatureKey>(
        FEATURE_DEFINITIONS.filter((f) => manager.isEnabled(f.id)).map((f) => f.id)
      );

      const refresh = () => tui.requestRender();

      return {
        render(width: number) {
          const lines: string[] = [];
          const add = (text: string) => lines.push(truncateToWidth(text, width));

          add(theme.fg("accent", theme.bold("Feature Flags")));
          add(theme.fg("dim", "Space toggles • Enter saves • Esc cancels"));
          lines.push("");

          for (let i = 0; i < FEATURE_DEFINITIONS.length; i++) {
            const feature = FEATURE_DEFINITIONS[i];
            const selected = i === selectedIndex;
            const checked = draft.has(feature.id);
            const marker = checked ? "[x]" : "[ ]";
            const prefix = selected ? theme.fg("accent", "> ") : "  ";
            const label = `${marker} ${feature.label}`;

            add(selected ? `${prefix}${theme.fg("accent", label)}` : `${prefix}${theme.fg("text", label)}`);
            add(`    ${theme.fg("muted", feature.description)}`);
          }

          return lines;
        },

        invalidate() {},

        handleInput(data: string) {
          if (matchesKey(data, Key.up)) {
            selectedIndex = Math.max(0, selectedIndex - 1);
            refresh();
          }
          if (matchesKey(data, Key.down)) {
            selectedIndex = Math.min(FEATURE_DEFINITIONS.length - 1, selectedIndex + 1);
            refresh();
          }
          if (matchesKey(data, Key.space)) {
            const feature = FEATURE_DEFINITIONS[selectedIndex];
            if (draft.has(feature.id)) draft.delete(feature.id);
            else draft.add(feature.id);
            refresh();
          }
          if (matchesKey(data, Key.enter)) {
            for (const f of FEATURE_DEFINITIONS) {
              manager.setEnabled(f.id, draft.has(f.id));
            }
            void manager.save();
            ctx.ui.notify(`Saved ${draft.size} features`, "info");
            done(undefined);
          }
          if (matchesKey(data, Key.escape)) {
            ctx.ui.notify("Cancelled", "info");
            done(undefined);
          }
        },
      };
    });
  },
});
```

### Tool Activation/Deactivation

```typescript
function syncToolActivation(
  pi: ExtensionAPI,
  enabledFeatures: Set<FeatureKey>,
  customToolNames: string[]
): void {
  const activeTools = new Set(pi.getActiveTools());

  for (const toolName of customToolNames) {
    if (enabledFeatures.has("agentTools")) {
      activeTools.add(toolName);
    } else {
      activeTools.delete(toolName);
    }
  }

  pi.setActiveTools(Array.from(activeTools));
}
```

---

## P27. Fuzzy Path Resolution

Implement intelligent path resolution that handles typos, partial matches, and relative paths.

### Resolution Strategy

```typescript
async function resolvePath(
  query: string,
  options: { allowDirectory?: boolean; limit?: number } = {}
): Promise<{
  kind: "resolved";
  absolutePath: string;
  relativePath: string;
  pathType: "file" | "directory";
  candidates?: Array<{ path: string; score: number }>;
} | {
  kind: "ambiguous";
  query: string;
  candidates: Array<{ path: string; score: number }>;
} | {
  kind: "missing";
  query: string;
}> {
  const normalized = query.trim().replace(/^@/, "").replace(/"/g, "");

  // 1. Direct path check
  const direct = await checkDirectPath(normalized, options.allowDirectory ?? true);
  if (direct) return { kind: "resolved", ...direct };

  // 2. Fuzzy search
  const searchResults = await fuzzySearch(normalized, options.limit ?? 8);

  if (searchResults.length === 0) {
    return { kind: "missing", query: normalized };
  }

  // 3. Auto-resolve if clear winner
  const best = searchResults[0];
  const second = searchResults[1];
  const scoreRatio = second ? best.score / second.score : Infinity;

  if (best.score > 100 || scoreRatio > 2) {
    return {
      kind: "resolved",
      absolutePath: best.path,
      relativePath: best.relativePath,
      pathType: best.pathType,
      candidates: searchResults.slice(0, 3),
    };
  }

  // 4. Ambiguous - need user choice
  return {
    kind: "ambiguous",
    query: normalized,
    candidates: searchResults.slice(0, 5),
  };
}

async function checkDirectPath(
  query: string,
  allowDirectory: boolean
): Promise<{ absolutePath: string; relativePath: string; pathType: "file" | "directory" } | null> {
  const candidates = [
    query, // Absolute
    resolve(process.cwd(), query), // Relative to cwd
  ];

  for (const path of candidates) {
    const type = await getPathType(path);
    if (!type) continue;
    if (type === "directory" && !allowDirectory) continue;
    return {
      absolutePath: path,
      relativePath: relative(process.cwd(), path),
      pathType: type,
    };
  }
  return null;
}

async function getPathType(path: string): Promise<"file" | "directory" | null> {
  try {
    const info = await stat(path);
    if (info.isFile()) return "file";
    if (info.isDirectory()) return "directory";
    return null;
  } catch {
    return null;
  }
}
```

### Location Parsing

```typescript
// Parse "path:line:col" or "path:line:col-endLine:endCol" syntax
function parsePathLocation(query: string): {
  path: string;
  location?: { line: number; column?: number; endLine?: number; endColumn?: number };
} {
  const locationMatch = query.match(/^(.+?)(?::(\d+)(?::(\d+)(?::(\d+):(\d+))?)?)?$/);

  if (!locationMatch) return { path: query };

  const [, path, line, col, endLine, endCol] = locationMatch;

  return {
    path,
    location: line
      ? {
          line: parseInt(line, 10),
          column: col ? parseInt(col, 10) : undefined,
          endLine: endLine ? parseInt(endLine, 10) : undefined,
          endColumn: endCol ? parseInt(endCol, 10) : undefined,
        }
      : undefined,
  };
}

// Convert location to read params
function locationToReadParams(
  location: ReturnType<typeof parsePathLocation>["location"],
  userOffset?: number,
  userLimit?: number
): { offset?: number; limit?: number } {
  if (userOffset !== undefined || !location) {
    return { offset: userOffset, limit: userLimit };
  }

  if (location.endLine) {
    return {
      offset: location.line,
      limit: Math.max(1, location.endLine - location.line + 1),
    };
  }

  return {
    offset: location.line,
    limit: userLimit ?? 80, // Default context window
  };
}
```

---

## P28. Cursor-based Pagination

Handle large result sets with stateful cursor pagination.

### Cursor System

```typescript
const CURSOR_PREFIX = "myext:";
const MAX_CURSOR_STATES = 64;

interface CursorState<T> {
  items: T[];
  nextCursor: string | null;
  requestKey: string;
}

class CursorManager<T> {
  private cursors = new Map<string, CursorState<T>>();
  private counter = 0;

  store(state: Omit<CursorState<T>, "cursor">): string {
    const id = `${CURSOR_PREFIX}${++this.counter}`;
    this.cursors.set(id, { ...state, requestKey: state.requestKey });
    this.trim();
    return id;
  }

  get(cursorId: string): CursorState<T> | null {
    if (!cursorId.startsWith(CURSOR_PREFIX)) return null;
    return this.cursors.get(cursorId) ?? null;
  }

  private trim(): void {
    while (this.cursors.size > MAX_CURSOR_STATES) {
      const first = this.cursors.keys().next().value;
      if (first) this.cursors.delete(first);
    }
  }

  invalidate(requestKey: string): void {
    for (const [id, state] of this.cursors) {
      if (state.requestKey === requestKey) {
        this.cursors.delete(id);
      }
    }
  }
}

// Encode/decode helper
function encodeCursor<T>(prefix: string, payload: T): string {
  return `${prefix}${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
}

function decodeCursor<T>(cursor: string, prefix: string): T | null {
  if (!cursor.startsWith(prefix)) return null;
  try {
    const decoded = Buffer.from(cursor.slice(prefix.length), "base64url").toString("utf8");
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}
```

### Grep with Pagination

```typescript
interface GrepContinuation {
  remainingItems: GrepMatch[];
  engineCursor: string | null;
  requestKey: string;
}

class GrepPaginator {
  private manager = new CursorManager<GrepMatch>();

  async grepWithPagination(
    request: { pattern: string; limit: number; cursor?: string },
    engine: { grep(params: any): Promise<{ items: GrepMatch[]; nextCursor: string | null }> }
  ): Promise<{
    items: GrepMatch[];
    formatted: string;
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const requestKey = JSON.stringify({ pattern: request.pattern });
    let continuation: GrepContinuation | null = null;

    // Restore state from cursor
    if (request.cursor) {
      const decoded = decodeCursor<GrepContinuation>(request.cursor, "grep:");
      if (decoded?.requestKey === requestKey) {
        continuation = decoded;
      }
    }

    const items: GrepMatch[] = [];
    let engineCursor = continuation?.engineCursor ?? null;
    const remaining = continuation ? [...continuation.remainingItems] : [];

    // Drain remaining items first
    while (remaining.length > 0 && items.length < request.limit) {
      items.push(remaining.shift()!);
    }

    // Fetch more from engine
    while (items.length < request.limit && engineCursor !== null) {
      const result = await engine.grep({
        pattern: request.pattern,
        cursor: engineCursor,
      });

      remaining.push(...result.items);
      engineCursor = result.nextCursor;

      while (remaining.length > 0 && items.length < request.limit) {
        items.push(remaining.shift()!);
      }
    }

    const hasMore = remaining.length > 0 || engineCursor !== null;

    return {
      items,
      formatted: this.formatResults(items),
      nextCursor: hasMore
        ? encodeCursor("grep:", {
            remainingItems: remaining,
            engineCursor,
            requestKey,
          })
        : undefined,
      hasMore,
    };
  }

  private formatResults(items: GrepMatch[]): string {
    return items.map((m) => `${m.path}:${m.line}: ${m.content}`).join("\n");
  }
}
```

### Tool Integration

```typescript
pi.registerTool({
  name: "grep",
  parameters: Type.Object({
    pattern: Type.String(),
    limit: Type.Number({ default: 100 }),
    cursor: Type.Optional(Type.String()),
  }),
  async execute(_id, params) {
    const paginator = new GrepPaginator();
    const result = await paginator.grepWithPagination(
      { pattern: params.pattern, limit: params.limit, cursor: params.cursor },
      { grep: (p) => engine.grep(p) }
    );

    return {
      content: [{ type: "text", text: result.formatted }],
      details: {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        count: result.items.length,
      },
    };
  },
});
```

---

## P29. Editor Autocomplete Integration

Integrate fuzzy file search into the editor's autocomplete system.

### Autocomplete Provider

```typescript
import type { AutocompleteItem, AutocompleteProvider, AutocompleteSuggestions } from "@earendil-works/pi-tui";
import type { FffRuntime } from "./runtime";

const PATH_DELIMITERS = new Set([" ", "\t", '"', "'", "="]);
const MAX_RESULTS = 20;

class PathAutocompleteProvider implements AutocompleteProvider {
  constructor(
    private baseProvider: AutocompleteProvider,
    private runtime: FffRuntime
  ) {}

  async getSuggestions(
    lines: string[],
    cursorLine: number,
    cursorCol: number,
    options: { signal: AbortSignal; force?: boolean }
  ): Promise<AutocompleteSuggestions | null> {
    const currentLine = lines[cursorLine] ?? "";
    const textBeforeCursor = currentLine.slice(0, cursorCol);

    // Check if we're in a @path context
    const atPrefix = this.extractAtPrefix(textBeforeCursor);
    if (!atPrefix) {
      // Delegate to base provider
      return this.baseProvider.getSuggestions(lines, cursorLine, cursorCol, options);
    }

    if (options.signal.aborted) return null;

    // Search for file candidates
    const { rawQuery, isQuoted } = this.parseAtPrefix(atPrefix);
    const candidates = await this.runtime.searchFileCandidates(rawQuery, MAX_RESULTS);

    if (options.signal.aborted || candidates.length === 0) {
      return this.baseProvider.getSuggestions(lines, cursorLine, cursorCol, options);
    }

    return {
      prefix: atPrefix,
      items: candidates.map((c) => this.toSuggestion(c, isQuoted)),
    };
  }

  applyCompletion(
    lines: string[],
    cursorLine: number,
    cursorCol: number,
    item: AutocompleteItem,
    prefix: string
  ): { lines: string[]; cursorLine: number; cursorCol: number } {
    // Track the query for frecency scoring
    this.runtime.trackQuery(prefix, item.value.replace(/^@/, ""));

    // Delegate to base provider for actual insertion
    return this.baseProvider.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
  }

  private extractAtPrefix(text: string): string | null {
    // Find unclosed quote after @
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === '"') {
        // Check if preceded by @
        for (let j = i - 1; j >= 0; j--) {
          if (text[j] === "@" && (j === 0 || PATH_DELIMITERS.has(text[j - 1]))) {
            return text.slice(j);
          }
        }
      }
    }

    // Find @ at word boundary
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === "@" && (i === 0 || PATH_DELIMITERS.has(text[i - 1]))) {
        return text.slice(i);
      }
    }

    return null;
  }

  private parseAtPrefix(prefix: string): { rawQuery: string; isQuoted: boolean } {
    if (prefix.startsWith('@"')) {
      return { rawQuery: prefix.slice(2), isQuoted: true };
    }
    return { rawQuery: prefix.slice(1), isQuoted: false };
  }

  private toSuggestion(candidate: { path: string; score: number }, isQuoted: boolean): AutocompleteItem {
    const needsQuotes = isQuoted || candidate.path.includes(" ");
    return {
      value: needsQuotes ? `@"${candidate.path}"` : `@${candidate.path}`,
      label: candidate.path.split("/").pop() ?? candidate.path,
      description: `${candidate.path} · score: ${candidate.score}`,
    };
  }
}
```

### Custom Editor Integration

```typescript
import { CustomEditor } from "@earendil-works/pi-coding-agent";
import type { FffRuntime } from "./runtime";

export class MyCustomEditor extends CustomEditor {
  constructor(
    tui: TUI,
    theme: EditorTheme,
    keybindings: KeybindingsManager,
    private runtime: FffRuntime
  ) {
    super(tui, theme, keybindings);
  }

  override setAutocompleteProvider(provider: AutocompleteProvider): void {
    // Wrap base provider with our path-aware provider
    super.setAutocompleteProvider(new PathAutocompleteProvider(provider, this.runtime));
  }
}

// Apply in session_start
pi.on("session_start", async (_event, ctx) => {
  if (isFeatureEnabled("autocomplete") && runtime) {
    ctx.ui.setEditorComponent(
      (tui, theme, keybindings) => new MyCustomEditor(tui, theme, keybindings, runtime)
    );
  }
});
```

### Key Points

1. **Prefix Detection** - Look for `@` or `@"` at cursor position
2. **Graceful Degradation** - Fall back to base provider when no @ context
3. **Result Scoring** - Show match type and score in description
4. **Frecency Tracking** - Track selections to improve ranking over time
5. **Quote Handling** - Preserve user's quoting style or auto-quote paths with spaces

---

## P30. Pure Config Extension

Zero-code configuration extension using only `config.json`.

### Directory Structure

```
~/.pi/agent/extensions/my-config/
└── config.json
```

### Config Format

```json
{
  "registerToolOverrides": {
    "read": true,
    "grep": true,
    "find": true,
    "ls": true,
    "bash": true,
    "edit": true,
    "write": true
  },
  "readOutputMode": "preview",
  "searchOutputMode": "preview",
  "previewLines": 12,
  "expandedPreviewMaxLines": 4000,
  "bashOutputMode": "preview",
  "bashCollapsedLines": 20,
  "diffViewMode": "auto",
  "diffSplitMinWidth": 120,
  "diffCollapsedLines": 24,
  "diffWordWrap": true
}
```

### Supported Config Keys

| Key | Type | Description |
|-----|------|-------------|
| `registerToolOverrides` | `Record<string, boolean>` | Enable tool result interception for listed tools |
| `readOutputMode` | `"preview" \| "full"` | Read tool display mode |
| `searchOutputMode` | `"preview" \| "full"` | Grep/find display mode |
| `bashOutputMode` | `"preview" \| "full"` | Bash output display |
| `previewLines` | `number` | Collapsed preview line count |
| `diffViewMode` | `"auto" \| "split" \| "unified"` | Edit diff display style |

### Processing Flow

```
Tool Execution
    │
    ▼
Builtin Tool Runs
    │
    ▼
Extension Config Intercepts Result
    │
    ▼
Apply Output Transformations
    │
    ▼
Display to User
```

### Use Cases

1. **Tool Output Compaction** - Auto-collapse long read/grep/bash results
2. **Diff Display Preferences** - Force split/unified diff mode
3. **Preview Settings** - Reduce visual noise in tool results
4. **No Code Maintenance** - Update config without touching TypeScript

---

## P31. Tool Result Interception

Intercept and transform tool results after execution but before display.

### Basic Interception

```typescript
import { isToolResultEvent } from "@earendil-works/pi-coding-agent";

pi.on("tool_result", async (event) => {
  // Only process specific tools
  if (event.toolName === "read") {
    const text = event.content[0]?.text;
    if (!text) return;

    // Apply transformations
    const transformed = transformReadOutput(text);

    return {
      content: [{ type: "text", text: transformed }],
    };
  }
});
```

### Conditional Compaction

```typescript
import type { ToolResultEvent } from "@earendil-works/pi-coding-agent";

interface CompactionConfig {
  enabled: boolean;
  maxChars: number;
  maxLines: number;
  stripAnsi: boolean;
}

function compactToolResult(
  event: ToolResultEvent,
  config: CompactionConfig
): { content: any[]; metadata: any } | undefined {
  if (!config.enabled) return;

  const text = extractText(event.content);
  if (!text) return;

  const originalLength = text.length;
  let result = text;

  // Apply compaction pipeline
  if (config.stripAnsi) {
    result = stripAnsiCodes(result);
  }

  if (result.length > config.maxChars) {
    result = truncateSmart(result, config.maxChars);
  }

  const lines = result.split("\n");
  if (lines.length > config.maxLines) {
    result = lines.slice(0, config.maxLines).join("\n") + "\n...";
  }

  return {
    content: [{ type: "text", text: result }],
    metadata: {
      compaction: {
        originalLength,
        compactedLength: result.length,
        techniques: ["truncate", "strip-ansi"],
      },
    },
  };
}
```

### Smart Truncation with Context

```typescript
function truncateSmart(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  // Try to find natural break point
  const preferredBreaks = ["\n\n", "\n", ". ", "; "];
  const reserve = Math.min(maxChars * 0.1, 100); // 10% or 100 chars reserve

  for (const brk of preferredBreaks) {
    const searchEnd = maxChars - reserve;
    const idx = text.lastIndexOf(brk, searchEnd);
    if (idx > maxChars * 0.5) {
      return text.slice(0, idx) + "\n\n... [truncated]";
    }
  }

  // Hard truncate at word boundary
  const hardLimit = maxChars - 20;
  const lastSpace = text.lastIndexOf(" ", hardLimit);
  const cutoff = lastSpace > hardLimit * 0.8 ? lastSpace : hardLimit;

  return text.slice(0, cutoff) + " ... [truncated]";
}
```

### Pattern-Specific Handlers

```typescript
// Git output compaction
function compactGitOutput(text: string): string {
  const lines = text.split("\n");
  const compacted: string[] = [];
  let inDiff = false;

  for (const line of lines) {
    // Collapse large diffs
    if (line.startsWith("diff --git")) {
      inDiff = true;
      compacted.push(line);
    } else if (inDiff && line.startsWith("@@")) {
      // Show hunk headers only
      compacted.push(line);
    } else if (inDiff && compacted[compacted.length - 1] !== "...") {
      compacted.push("...");
    } else if (!inDiff) {
      compacted.push(line);
    }
  }

  return compacted.join("\n");
}

// Test output aggregation
function aggregateTestOutput(text: string): string {
  const lines = text.split("\n");
  const passCount = lines.filter((l) => /✓|PASS|ok/.test(l)).length;
  const failCount = lines.filter((l) => /✗|FAIL|not ok/.test(l)).length;

  if (passCount > 10 && failCount === 0) {
    return `Tests: ${passCount} passed (aggregated output)\n${
      lines.slice(-5).join("\n") // Show last 5 lines only
    }`;
  }

  return text;
}
```

### Source Code Filtering

```typescript
function filterSourceCode(
  text: string,
  options: { level: "none" | "minimal" | "aggressive" }
): string {
  if (options.level === "none") return text;

  const lines = text.split("\n");
  const filtered: string[] = [];
  let skipDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Aggressive: skip all comments
    if (options.level === "aggressive") {
      if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*")) {
        continue;
      }
    }

    // Minimal: keep contract comments, skip implementation notes
    if (options.level === "minimal") {
      // Skip obvious noise
      if (/^\s*\/\/\s*(TODO|FIXME|NOTE|DEBUG|HACK)/.test(line)) {
        continue;
      }
      // Skip empty JSDoc lines
      if (/^\s*\*\s*$/.test(line)) continue;
    }

    // Track block comments
    if (trimmed.startsWith("/*")) skipDepth++;
    if (trimmed.includes("*/")) skipDepth--;

    if (skipDepth === 0) {
      filtered.push(line);
    }
  }

  return filtered.join("\n");
}
```

---

## P32. Type-Safe Config Store

Robust configuration persistence with validation and defaults.

### Config Schema Definition

```typescript
import { z } from "zod";

const ConfigSchema = z.object({
  enabled: z.boolean().default(true),
  mode: z.enum(["rewrite", "suggest"]).default("rewrite"),
  outputCompaction: z.object({
    enabled: z.boolean().default(true),
    stripAnsi: z.boolean().default(true),
    truncate: z.object({
      enabled: z.boolean().default(true),
      maxChars: z.number().min(100).max(50000).default(12000),
    }).default({}),
    smartTruncate: z.object({
      enabled: z.boolean().default(true),
      maxLines: z.number().min(10).max(1000).default(220),
    }).default({}),
  }).default({}),
  rewriteRules: z.object({
    git: z.boolean().default(true),
    filesystem: z.boolean().default(true),
    rust: z.boolean().default(true),
  }).default({}),
});

type Config = z.infer<typeof ConfigSchema>;
```

### Config Store Implementation

```typescript
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

const CONFIG_PATH = join(getAgentDir(), "extensions", "my-ext", "config.json");

interface ConfigLoadResult {
  config: Config;
  warning?: string;
}

class ConfigStore {
  private cache: Config | null = null;
  private lastLoadTime = 0;

  load(): ConfigLoadResult {
    try {
      const raw = readFileSync(CONFIG_PATH, "utf8");
      const parsed = JSON.parse(raw);
      const validated = ConfigSchema.parse(parsed);
      this.cache = validated;
      this.lastLoadTime = Date.now();
      return { config: validated };
    } catch (error) {
      // Return defaults on error
      const defaults = ConfigSchema.parse({});
      return {
        config: defaults,
        warning: `Config load failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  save(config: Config): { success: boolean; error?: string } {
    try {
      mkdirSync(dirname(CONFIG_PATH), { recursive: true });
      const serialized = JSON.stringify(config, null, 2);
      writeFileSync(CONFIG_PATH, serialized, "utf8");
      this.cache = config;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  get(): Config {
    if (this.cache && Date.now() - this.lastLoadTime < 5000) {
      return this.cache;
    }
    return this.load().config;
  }

  update(partial: Partial<Config>): { success: boolean; error?: string } {
    const current = this.get();
    const merged = { ...current, ...partial };
    return this.save(ConfigSchema.parse(merged));
  }
}

// Singleton export
export const configStore = new ConfigStore();
```

### Environment-Based Override

```typescript
function loadConfigWithEnvOverride(): Config {
  const base = configStore.load().config;

  // Allow environment variable overrides
  return {
    ...base,
    enabled: process.env.MY_EXT_ENABLED
      ? process.env.MY_EXT_ENABLED === "true"
      : base.enabled,
    outputCompaction: {
      ...base.outputCompaction,
      truncate: {
        ...base.outputCompaction.truncate,
        maxChars: process.env.MY_EXT_MAX_CHARS
          ? parseInt(process.env.MY_EXT_MAX_CHARS, 10)
          : base.outputCompaction.truncate.maxChars,
      },
    },
  };
}
```

---

## P33. Bounded Notice Tracker

Prevent notification spam with bounded deduplication.

### Implementation

```typescript
export interface BoundedNoticeTracker {
  remember(key: string): boolean; // Returns true if first time
  reset(): void;
}

export function createBoundedNoticeTracker(maxEntries: number): BoundedNoticeTracker {
  const normalizedLimit = Math.max(1, Math.floor(maxEntries));
  const seen = new Set<string>();
  const order: string[] = [];

  return {
    remember(key: string): boolean {
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      order.push(key);

      // Evict oldest if over limit
      while (order.length > normalizedLimit) {
        const evicted = order.shift();
        if (evicted !== undefined) {
          seen.delete(evicted);
        }
      }

      return true;
    },

    reset(): void {
      seen.clear();
      order.length = 0;
    },
  };
}
```

### Usage Pattern

```typescript
export default function myExtension(pi: ExtensionAPI) {
  const warnings = createBoundedNoticeTracker(100);
  const suggestions = createBoundedNoticeTracker(200);

  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName === "bash") {
      const exitCode = event.details?.exitCode;

      // Only warn once per unique command pattern
      const key = `bash-fail:${event.input.command}:${exitCode}`;
      if (exitCode !== 0 && warnings.remember(key)) {
        ctx.ui.notify(`Command failed with exit ${exitCode}`, "warning");
      }
    }
  });

  pi.on("agent_end", async () => {
    // Reset trackers per turn to allow fresh warnings
    warnings.reset();
    suggestions.reset();
  });
}
```

### Key Benefits

1. **Memory Bound** - LRU eviction prevents unbounded growth
2. **Per-Session Scope** - Natural lifecycle with extension
3. **Semantic Keys** - Combine command + context for precision
4. **Silent Deduplication** - Second+ occurrences are silently ignored

---

## P34. Command Rewriting Pipeline

Transform bash commands before execution for safety/compatibility.

### Rewrite Rules Engine

```typescript
interface RewriteRule {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: RegExpMatchArray) => string);
  condition?: (ctx: RewriteContext) => boolean;
}

interface RewriteContext {
  cwd: string;
  shell: string;
  rtkAvailable: boolean;
}

const RULES: RewriteRule[] = [
  // Replace dangerous rm with trash
  {
    name: "rm-safety",
    pattern: /\brm\s+(-[rf]+\s+)?(.+)/,
    replacement: (match) => {
      const flags = match[1] || "";
      const target = match[2];
      // Only rewrite if recursive/force
      if (flags.includes("r") || flags.includes("f")) {
        return `trash ${target}`;
      }
      return match[0];
    },
  },

  // Convert find to fd
  {
    name: "find-to-fd",
    pattern: /\bfind\s+(.+?\s+-name\s+)(['"]?)(.+?)\2/,
    replacement: "fd $3 $1",
    condition: (ctx) => ctx.rtkAvailable,
  },

  // Convert grep to rg (with smart case)
  {
    name: "grep-to-rg",
    pattern: /\bgrep\s+(?:-[a-z]+\s+)*['"]?(.+?)['"]?/,
    replacement: "rg $1",
    condition: (ctx) => ctx.rtkAvailable,
  },

  // Windows compatibility
  {
    name: "windows-cat",
    pattern: /\bcat\s+/,
    replacement: "type ",
    condition: (ctx) => process.platform === "win32",
  },
];
```

### Rewrite Pipeline

```typescript
function rewriteCommand(
  command: string,
  ctx: RewriteContext,
  rules: RewriteRule[]
): { command: string; rewrites: string[] } {
  let result = command;
  const applied: string[] = [];

  for (const rule of rules) {
    if (rule.condition && !rule.condition(ctx)) {
      continue;
    }

    const before = result;
    if (typeof rule.replacement === "string") {
      result = result.replace(rule.pattern, rule.replacement);
    } else {
      result = result.replace(rule.pattern, (match, ...args) => {
        return rule.replacement!(args);
      });
    }

    if (result !== before) {
      applied.push(rule.name);
    }
  }

  return { command: result, rewrites: applied };
}
```

### Integration with Bash Interception

```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

export default function commandRewriterExtension(pi: ExtensionAPI) {
  const config = loadConfig();

  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;

    const originalCommand = event.input.command;
    const rewriteCtx: RewriteContext = {
      cwd: ctx.cwd,
      shell: process.env.SHELL || "/bin/sh",
      rtkAvailable: isRtkAvailable(),
    };

    const { command: rewritten, rewrites } = rewriteCommand(
      originalCommand,
      rewriteCtx,
      RULES
    );

    if (rewrites.length > 0 && config.showNotifications) {
      ctx.ui.notify(
        `Rewrote: ${originalCommand.slice(0, 50)} -> ${rewritten.slice(0, 50)}`,
        "info"
      );
    }

    // Return modified command
    return {
      input: {
        ...event.input,
        command: rewritten,
      },
      metadata: {
        originalCommand,
        rewrites,
      },
    };
  });
}
```

### Safety Considerations

```typescript
// Whitelist allowed commands (safest approach)
const ALLOWED_COMMANDS = new Set([
  "git", "ls", "cat", "grep", "find", "trash",
  "mkdir", "cp", "mv", "echo", "head", "tail",
]);

function isSafeCommand(command: string): boolean {
  const firstToken = command.trim().split(/\s+/)[0];
  return ALLOWED_COMMANDS.has(firstToken);
}

// Or use blocklist for dangerous patterns
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,      // rm -rf /
  />\s*\/dev\/null/,     // /dev/null destruction
  /:\(\)\{\s*:\|:&\s*\};:/, // Fork bomb
];

function isDangerous(command: string): boolean {
  return DANGEROUS_PATTERNS.some((p) => p.test(command));
}
```

---

## P35. Session Entry Persistence

Persist state across turns using session entries instead of in-memory variables.

### Why Session Entries

- **Survives compaction** - Unlike in-memory state, entries persist after context compression
- **Branch resilient** - State travels with the conversation branch
- **Serializable** - Data is JSON-encoded and stored to disk

### Persistence Pattern

```typescript
const CUSTOM_TYPE = "my-extension-state";
const STATE_KEY = "myState";

function persistState(pi: ExtensionAPI, data: Record<string, any>): void {
  pi.appendEntry(CUSTOM_TYPE, data);
}

function loadState(ctx: ExtensionContext): Record<string, any> | null {
  const branch = ctx.sessionManager.getBranch();
  
  // Walk backwards to find latest state
  for (let i = branch.length - 1; i >= 0; i--) {
    const entry = branch[i];
    if (entry.type === "custom_message" && 
        (entry as any).customType === CUSTOM_TYPE) {
      return (entry as any).data || {};
    }
  }
  return null;
}

// Session start recovery
pi.on("session_start", async (_event, ctx) => {
  const state = loadState(ctx);
  if (state?.enabled) {
    ctx.ui.notify("Restored from previous session", "info");
    initializeFromState(state);
  }
});
```

### State Updates

```typescript
class StateManager {
  private cache: Map<string, any> = new Map();
  private dirty = false;

  set(key: string, value: any): void {
    this.cache.set(key, value);
    this.dirty = true;
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  flush(pi: ExtensionAPI): void {
    if (!this.dirty) return;
    
    persistState(pi, Object.fromEntries(this.cache));
    this.dirty = false;
  }
}

// Auto-flush on turn end
pi.on("turn_end", async (_event, _ctx, pi) => {
  stateManager.flush(pi);
});
```

### Multi-Field State

```typescript
interface AppState {
  enabled: boolean;
  lastCommand: string;
  checkpointParams?: {
    target: string;
    message: string;
    backupTag?: string;
  };
}

const STATE_KEYS = {
  enabled: "appEnabled",
  lastCommand: "lastCmd",
  checkpoint: "checkpointParams",
} as const;

function persistAcmState(pi: ExtensionAPI, partial: Partial<AppState>): void {
  const current = loadLatestState(pi) || {};
  const merged = { ...current, ...partial };
  
  pi.appendEntry("my-app-state", {
    [STATE_KEYS.enabled]: merged.enabled,
    [STATE_KEYS.lastCommand]: merged.lastCommand,
    [STATE_KEYS.checkpoint]: merged.checkpointParams,
    _timestamp: Date.now(),
  });
}
```

---

## P36. Deferred Execution Pattern

Defer side effects to turn_end/agent_end hooks for multi-step operations.

### Use Case

Tool validates parameters but actual navigation/action happens after LLM response completes.

### Implementation

```typescript
interface DeferredOperation {
  id: string;
  params: any;
  createdAt: number;
}

class DeferredExecutor {
  private pending: DeferredOperation | null = null;

  schedule(op: DeferredOperation): void {
    this.pending = op;
  }

  clear(): void {
    this.pending = null;
  }

  async execute(ctx: ExtensionContext): Promise<void> {
    if (!this.pending) return;
    
    const op = this.pending;
    this.pending = null;

    // Perform the actual operation
    await this.runOperation(ctx, op);
  }

  private async runOperation(ctx: ExtensionContext, op: DeferredOperation): Promise<void> {
    // Implementation
  }
}

const executor = new DeferredExecutor();

// Tool just validates and schedules
pi.registerTool({
  name: "checkout",
  async execute(_id, params, _signal, _onUpdate, ctx) {
    // Validate
    if (!isValidTarget(params.target)) {
      return { content: [{ type: "text", text: "Invalid target" }] };
    }

    // Check prerequisites
    if (!isActivated()) {
      return {
        content: [{
          type: "text",
          text: "Feature not activated. Run /activate first.",
        }],
      };
    }

    // Schedule for later
    executor.schedule({
      id: crypto.randomUUID(),
      params,
      createdAt: Date.now(),
    });

    return {
      content: [{ type: "text", text: "Operation scheduled. Processing..." }],
    };
  },
});

// Execute after LLM finishes
pi.on("turn_end", async (_event, ctx) => {
  await executor.execute(ctx);
});

// Or at agent completion
pi.on("agent_end", async (_event, ctx) => {
  if (executor.hasPending()) {
    await executor.execute(ctx);
    ctx.ui.notify("Deferred operation completed", "info");
  }
});
```

### Navigation with State Carryover

```typescript
pi.on("agent_end", async (_event, ctx) => {
  if (!deferredNav) return;

  // Navigate tree to new node
  await ctx.navigateTree(deferredNav.targetId, {
    summarize: false,
  });

  // Notify with full details
  ctx.ui.notify(
    `Navigated to ${deferredNav.displayTarget}\n` +
    `Backup: ${deferredNav.backupTag || "none"}\n` +
    `Context: ${deferredNav.carryoverMessage.slice(0, 100)}...`,
    "info"
  );

  // Send follow-up message
  pi.sendMessage({
    customType: "navigation-complete",
    content: "Navigation complete. Review the context summary above.",
    display: false,
  }, {
    triggerTurn: true,
  });
});
```

---

## P37. Conditional Activation

Require explicit user activation before enabling dangerous/complex features.

### Activation Flow

```
User runs tool
    │
    ▼
Check: isActivated?
    │
    ├─ NO → Return error + activation command hint
    │
    └─ YES → Execute normally
```

### Implementation

```typescript
const ACTIVATION_COMMAND = "/acm";
const ACTIVATION_STATE_KEY = "acmEnabled";

let isActivated = false;
let commandCtx: ExtensionCommandContext | null = null;

function checkActivation(ctx: ExtensionContext): { ok: true } | { ok: false; hint: string } {
  if (isActivated) return { ok: true };

  return {
    ok: false,
    hint: `Feature not enabled. Run ${ACTIVATION_COMMAND} first, then retry.`,
  };
}

// Activation command
pi.registerCommand("acm", {
  description: "Enable agentic context management",
  handler: async (args, ctx) => {
    commandCtx = ctx;
    isActivated = true;

    // Persist activation
    pi.appendEntry("acm-state", { [ACTIVATION_STATE_KEY]: true });

    ctx.ui.notify("ACM enabled", "info");

    // Optional: trigger immediate follow-up
    if (args) {
      pi.sendUserMessage(args);
    }
  },
});

// Tool with guard
pi.registerTool({
  name: "context_checkout",
  async execute(_id, params, _signal, _onUpdate, ctx) {
    const check = checkActivation(ctx);
    if (!check.ok) {
      // Auto-hint activation
      ctx.ui.setEditorText(`${ACTIVATION_COMMAND} ${ctx.ui.getEditorText() || ""}`);

      return {
        content: [{ type: "text", text: check.hint }],
        details: { activationRequired: true },
      };
    }

    // Proceed with actual implementation
    return performCheckout(ctx, params);
  },
});

// Restore on session start
pi.on("session_start", async (_event, ctx) => {
  const state = loadAcmState(ctx);
  if (state?.[ACTIVATION_STATE_KEY]) {
    isActivated = true;
    ctx.ui.notify("ACM restored from previous session", "info");
  }
});
```

### Soft Activation (Hint Only)

```typescript
function softCheck(ctx: ExtensionContext): boolean {
  if (isActivated) return true;

  // Still work but warn
  ctx.ui.notify("Tip: Run /acm for enhanced features", "info");
  return true;
}
```

---

## P38. Auto-Milestone Detection

Automatically identify and surface important conversation nodes.

### Detection Criteria

```typescript
interface MilestoneRule {
  name: string;
  test: (entry: SessionEntry, sm: SessionManager) => boolean;
  priority: number;
}

const MILESTONE_RULES: MilestoneRule[] = [
  {
    name: "HEAD",
    test: (entry, sm) => entry.id === sm.getLeafId(),
    priority: 100,
  },
  {
    name: "Root",
    test: (entry, branch) => branch.length > 0 && entry.id === branch[0].id,
    priority: 90,
  },
  {
    name: "Tagged",
    test: (entry, sm) => !!sm.getLabel(entry.id),
    priority: 80,
  },
  {
    name: "Branch Point",
    test: (entry, sm) => sm.getChildren(entry.id).length > 1,
    priority: 70,
  },
  {
    name: "User Message",
    test: (entry) => entry.type === "message" && entry.message.role === "user",
    priority: 60,
  },
  {
    name: "Summary",
    test: (entry) => entry.type === "branch_summary" || entry.type === "compaction",
    priority: 50,
  },
];

function isMilestone(
  entry: SessionEntry,
  sm: SessionManager,
  verbose: boolean
): boolean {
  if (verbose) return true;

  const branch = sm.getBranch();
  return MILESTONE_RULES.some((rule) => rule.test(entry, sm, branch));
}
```

### Smart Tag Target Selection

```typescript
function findBestTagTarget(sm: SessionManager): string | null {
  const branch = sm.getBranch();
  const internalTools = new Set(["context_tag", "context_log"]);

  for (let i = branch.length - 1; i >= 0; i--) {
    const entry = branch[i];

    // Skip internal tool results
    if (entry.type === "message" && entry.message.role === "toolResult") {
      const tr = entry.message as any;
      if (internalTools.has(tr.toolName)) continue;
      return entry.id; // Public tool result is valid
    }

    // Skip assistant messages with only internal tools
    if (entry.type === "message" && entry.message.role === "assistant") {
      const hasOnlyInternal = entry.message.content.every(
        (c: any) => c.type !== "toolCall" || internalTools.has(c.name)
      );
      if (!hasOnlyInternal) return entry.id;
    }

    // User messages are always valid
    if (entry.type === "message" && entry.message.role === "user") {
      return entry.id;
    }
  }

  return sm.getLeafId();
}
```

### Visual Timeline Generation

```typescript
function generateTimeline(
  sm: SessionManager,
  options: { limit?: number; verbose?: boolean }
): string {
  const branch = sm.getBranch();
  const lines: string[] = [];
  let hiddenCount = 0;

  for (const entry of branch) {
    if (!isMilestone(entry, sm, options.verbose ?? false)) {
      hiddenCount++;
      continue;
    }

    if (hiddenCount > 0) {
      lines.push(`  ... (${hiddenCount} hidden) ...`);
      hiddenCount = 0;
    }

    const marker = getMarker(entry, sm);
    const meta = getMeta(entry, sm);
    const content = getContent(entry).slice(0, 100);

    lines.push(`${marker} ${entry.id} ${meta} ${content}`);
  }

  return lines.join("\n");
}

function getMarker(entry: SessionEntry, sm: SessionManager): string {
  if (entry.id === sm.getLeafId()) return "*";
  if (entry.type === "message" && entry.message.role === "user") return "•";
  return "│";
}

function getMeta(entry: SessionEntry, sm: SessionManager): string {
  const parts: string[] = [];
  
  if (sm.getLabel(entry.id)) {
    parts.push(`tag:${sm.getLabel(entry.id)}`);
  }
  
  const role = entry.type === "message" 
    ? entry.message.role.toUpperCase()
    : entry.type.toUpperCase();
  parts.push(`[${role}]`);

  return parts.length > 0 ? `(${parts.join(", ")})` : "";
}
```

### Context Dashboard (HUD)

```typescript
async function generateContextHUD(ctx: ExtensionContext): Promise<string> {
  const usage = await ctx.getContextUsage();
  const sm = ctx.sessionManager;
  const branch = sm.getBranch();

  // Calculate distance to last tag
  let stepsSinceTag = 0;
  let nearestTag = "None";
  
  for (let i = branch.length - 1; i >= 0; i--) {
    const label = sm.getLabel(branch[i].id);
    if (label) {
      nearestTag = label;
      break;
    }
    stepsSinceTag++;
  }

  const usageStr = usage
    ? `${usage.percent.toFixed(1)}% (${formatTokens(usage.tokens)}/${formatTokens(usage.contextWindow)})`
    : "Unknown";

  return [
    `[Context Dashboard]`,
    `• Usage:    ${usageStr}`,
    `• Distance: ${stepsSinceTag} steps since '${nearestTag}'`,
    `• Nodes:    ${branch.length} total`,
    `---------------------------------------------------`,
  ].join("\n");
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return n.toString();
}
```
