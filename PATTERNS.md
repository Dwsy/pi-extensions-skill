# Pi Extension Pattern Library

> Copy-paste recipes organized by intent. Every pattern includes exact imports and minimal surrounding code.

---

## Table of Contents

- [P1. Minimal Extension](#p1-minimal-extension)
- [P2. Tool Registration](#p2-tool-registration)
- [P3. Tool with Streaming Progress](#p3-tool-with-streaming-progress)
- [P4. Override Built-in Tool](#p4-override-built-in-tool)
- [P5. Safe File Mutation](#p5-safe-file-mutation)
- [P6. Command Registration](#p6-command-registration)
- [P7. Command with Autocomplete](#p7-command-with-autocomplete)
- [P8. Event: Block Dangerous Bash](#p8-event-block-dangerous-bash)
- [P9. Event: Modify Tool Result](#p9-event-modify-tool-result)
- [P10. Event: Inject System Prompt](#p10-event-inject-system-prompt)
- [P11. Event: Transform User Input](#p11-event-transform-user-input)
- [P12. Custom UI: Select Dialog](#p12-custom-ui-select-dialog)
- [P13. Custom UI: Timer-based Confirmation](#p13-custom-ui-timer-based-confirmation)
- [P14. Custom UI: Widget](#p14-custom-ui-widget)
- [P15. State Persistence](#p15-state-persistence)
- [P16. Branch-Resilient State](#p16-branch-resilient-state)
- [P17. Inter-Extension Communication](#p17-inter-extension-communication)
- [P18. Custom Message Renderer](#p18-custom-message-renderer)
- [P19. Dynamic Provider Registration](#p19-dynamic-provider-registration)
- [P20. OAuth Provider](#p20-oauth-provider)
- [P21. RPC-Safe Extension](#p21-rpc-safe-extension)
- [P22. Compaction Hook](#p22-compaction-hook)
- [P23. Model Switch on Command](#p23-model-switch-on-command)
- [P24. Load State from Session](#p24-load-state-from-session)

---

## P1. Minimal Extension

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

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
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

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
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

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
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";
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
import type { AutocompleteItem } from "@mariozechner/pi-tui";

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
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

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
import { isReadToolResult } from "@mariozechner/pi-coding-agent";

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
import { Container, Text, SelectList } from "@mariozechner/pi-tui";

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
import { Text } from "@mariozechner/pi-tui";

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
  const { compact } = await import("@mariozechner/pi-coding-agent");
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
