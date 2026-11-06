# Pi Extensions Code Examples

## Tool Examples

### Basic Tool

```typescript
pi.registerTool({
  name: "greet",
  label: "Greet",
  description: "Greet someone",
  parameters: Type.Object({
    name: Type.String({ description: "Name" }),
  }),

  async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
    return {
      content: [{ type: "text", text: `Hello, ${params.name}!` }],
      details: { greeted: params.name },
    };
  },
});
```

### Tool with Streaming Updates

```typescript
pi.registerTool({
  name: "long_task",
  label: "Long Task",
  description: "Long-running task",
  parameters: Type.Object({ steps: Type.Number() }),

  async execute(_toolCallId, params, signal, onUpdate, _ctx) {
    for (let i = 0; i < params.steps; i++) {
      if (signal?.aborted) {
        return { content: [{ type: "text", text: "Cancelled" }] };
      }

      onUpdate?.({
        content: [{ type: "text", text: `Step ${i + 1}/${params.steps}...` }],
        details: { progress: (i + 1) / params.steps * 100 },
      });

      await new Promise(r => setTimeout(r, 1000));
    }

    return {
      content: [{ type: "text", text: "Done!" }],
      details: { completed: true },
    };
  },
});
```

### Tool with a Custom Renderer

```typescript
pi.registerTool({
  name: "process_files",
  label: "Process Files",
  description: "Process files",
  parameters: Type.Object({ files: Type.Array(Type.String()) }),

  async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
    return {
      content: [{ type: "text", text: `Processed ${params.files.length} files` }],
      details: { count: params.files.length, files: params.files },
    };
  },

  renderCall(args, theme) {
    return new Text(
      theme.fg("toolTitle", theme.bold("process_files ")) +
      theme.fg("muted", `${args.files?.length || 0} files`),
      0, 0
    );
  },

  renderResult(result, { expanded }, theme) {
    const details = result.details as { count: number } | undefined;
    let text = theme.fg("success", `✓ ${details?.count || 0} files`);

    if (expanded && details?.files) {
      text += "\n" + details.files.map(f => theme.fg("dim", `  ${f}`)).join("\n");
    }

    return new Text(text, 0, 0);
  },
});
```

## Command Examples

### Basic Command

```typescript
pi.registerCommand("hello", {
  description: "Say hello",
  handler: async (args, ctx) => {
    ctx.ui.notify(`Hello ${args || "world"}!`, "info");
  },
});
```

### Command with Argument Completion

```typescript
pi.registerCommand("deploy", {
  description: "Deploy to an environment",
  getArgumentCompletions: (prefix) => {
    const envs = ["dev", "staging", "prod"];
    const items = envs.map(e => ({ value: e, label: e }));
    return items.filter(i => i.value.startsWith(prefix));
  },
  handler: async (args, ctx) => {
    ctx.ui.notify(`Deploying: ${args}`, "info");
  },
});
```

### Command with Custom UI

```typescript
pi.registerCommand("select", {
  description: "Pick an option",
  handler: async (_args, ctx) => {
    const choice = await ctx.ui.select("Choose:", ["A", "B", "C"]);
    ctx.ui.notify(`Selected: ${choice}`, "info");
  },
});
```

## Event Handler Examples

### Permission Gate

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (isToolCallEventType("bash", event)) {
    const cmd = event.input.command;

    if (cmd?.includes("rm -rf")) {
      const ok = await ctx.ui.confirm("Danger!", `Allow: ${cmd}?`);
      if (!ok) return { block: true, reason: "User rejected" };
    }
  }
});
```

### Path Guard

```typescript
pi.on("tool_call", async (event, ctx) => {
  const path = event.input.path;
  const protectedPaths = [".env", "secrets.json", "node_modules/"];

  if (protectedPaths.some(p => path?.includes(p))) {
    const ok = await ctx.ui.confirm("Sensitive path!", `Allow access: ${path}?`);
    if (!ok) return { block: true, reason: "Path is protected" };
  }
});
```

### Input Transformation

```typescript
pi.on("input", async (event, ctx) => {
  if (event.text.startsWith("!")) {
    return {
      action: "transform",
      text: `Run command: ${event.text.slice(1)}`,
    };
  }
  return { action: "continue" };
});
```

## State Management Examples

### Simple Counter

```typescript
export default function (pi: ExtensionAPI) {
  let count = 0;

  pi.on("session_start", async (_event, ctx) => {
    // restore from the session
    for (const entry of ctx.sessionManager.getEntries()) {
      if (entry.type === "custom" && entry.customType === "counter") {
        count = (entry.data as { count: number }).count;
      }
    }
  });

  pi.registerTool({
    name: "counter",
    label: "Counter",
    description: "Counter tool",
    parameters: Type.Object({ action: StringEnum(["get", "increment", "reset"]) }),

    async execute(_id, params, _signal, _onUpdate, _ctx) {
      switch (params.action) {
        case "increment": count++; break;
        case "reset": count = 0; break;
      }

      // persist
      pi.appendEntry("counter", { count });

      return {
        content: [{ type: "text", text: `Count: ${count}` }],
        details: { count },
      };
    },
  });
}
```

## Custom UI Examples

### Select List

```typescript
const result = await ctx.ui.custom((tui, theme, _kb, done) => {
  let selected = 0;
  const options = ["Option 1", "Option 2", "Option 3"];

  function render(width: number): string[] {
    return options.map((opt, i) => {
      const prefix = i === selected ? theme.fg("accent", "> ") : "  ";
      const text = i === selected ? theme.fg("accent", opt) : opt;
      return prefix + text;
    });
  }

  function handleInput(data: string) {
    if (data === "up") selected = Math.max(0, selected - 1);
    if (data === "down") selected = Math.min(options.length - 1, selected + 1);
    if (data === "return") done(options[selected]);
    if (data === "escape") done(null);
    tui.requestRender();
  }

  return { render, invalidate: () => {}, handleInput };
});
```

### Loader

```typescript
import { BorderedLoader } from "@earendil-works/pi-coding-agent";

const result = await ctx.ui.custom((tui, theme, _kb, done) => {
  const loader = new BorderedLoader(tui, theme, "Loading...");

  loader.onAbort = () => done(null);

  // async work
  doWork({ signal: loader.signal })
    .then(result => done(result))
    .catch(() => done(null));

  return loader;
});
```

### Settings List

```typescript
import { SettingsList, getSettingsListTheme } from "@earendil-works/pi-tui";

const items = [
  { id: "opt1", label: "Option 1", currentValue: "on", values: ["on", "off"] },
  { id: "opt2", label: "Option 2", currentValue: "auto", values: ["auto", "manual"] },
];

await ctx.ui.custom((tui, theme, _kb, done) => {
  const settings = new SettingsList(
    items,
    10,
    getSettingsListTheme(),
    (id, value) => console.log(`${id} = ${value}`),
    () => done(undefined)
  );

  return {
    render: (w) => settings.render(w),
    invalidate: () => settings.invalidate(),
    handleInput: (d) => settings.handleInput?.(d),
  };
});
```

## Utilities

### Output Truncation

```typescript
import {
  truncateHead,
  truncateTail,
  formatSize,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";

const result = truncateHead(output, {
  maxLines: DEFAULT_MAX_LINES,
  maxBytes: DEFAULT_MAX_BYTES,
});

if (result.truncated) {
  const msg = `[Truncated: ${result.outputLines}/${result.totalLines} lines (${formatSize(result.outputBytes)}/${formatSize(result.totalBytes)})]`;
}
```

### Execute a Command

```typescript
const result = await pi.exec("git", ["status"], { signal, timeout: 5000 });
// result.stdout, result.stderr, result.code, result.killed
```

### Get Context Usage

```typescript
const usage = ctx.getContextUsage();
if (usage && usage.tokens > 100_000) {
  // trigger compaction or show a warning
}
```

### Model Switch

```typescript
const model = ctx.modelRegistry.find("anthropic", "claude-sonnet-4");
if (model) {
  const success = await pi.setModel(model);
  if (!success) {
    ctx.ui.notify("No API key for this model", "error");
  }
}
```

## New API Examples

### Inter-Extension Event Bus

```typescript
// Extension A: emit events
pi.events.emit("my:notification", { message: "hello", from: "ext-a" });

// Extension B: listen for events
pi.events.on("my:notification", (data) => {
  const { message, from } = data as { message: string; from: string };
  currentCtx?.ui.notify(`From ${from}: ${message}`, "info");
});
```

### Session Metadata

```typescript
// Name sessions for the selector
pi.setSessionName("Refactor auth module");
const name = pi.getSessionName();

// Bookmark entries for /tree navigation
pi.setLabel(entryId, "checkpoint-before-refactor");
pi.setLabel(entryId, undefined); // clear
const label = ctx.sessionManager.getLabel(entryId);
```

### Custom Message Rendering

```typescript
// Register renderer for your custom message type
pi.registerMessageRenderer("status-update", (message, { expanded }, theme) => {
  const level = (message.details as any)?.level ?? "info";
  const color = level === "error" ? "error" : "success";
  let text = `${theme.fg(color, `[${level}]`)} ${message.content}`;
  if (expanded && (message.details as any)?.timestamp) {
    text += `\n${theme.fg("dim", `  at ${new Date((message.details as any).timestamp).toLocaleTimeString()}`)}`;
  }
  const box = new Box(1, 1, (t) => theme.bg("customMessageBg", t));
  box.addChild(new Text(text, 0, 0));
  return box;
});

// Send custom messages
pi.sendMessage({
  customType: "status-update",
  content: "Deploy complete",
  display: true,
  details: { level: "info", timestamp: Date.now() },
});
```

### Dynamic Resource Discovery

```typescript
pi.on("resources_discover", () => ({
  skillPaths: [join(baseDir, "SKILL.md")],
  promptPaths: [join(baseDir, "dynamic.md")],
  themePaths: [join(baseDir, "dynamic.json")],
}));
```

### Custom Provider Registration

```typescript
// Register a proxy provider
pi.registerProvider("my-proxy", {
  baseUrl: "https://proxy.example.com",
  apiKey: "PROXY_API_KEY",
  api: "anthropic-messages",
  models: [{
    id: "claude-sonnet-4-20250514",
    name: "Claude 4 Sonnet (proxy)",
    reasoning: false,
    input: ["text", "image"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 16384,
  }],
});

// Override baseUrl for existing provider
pi.registerProvider("anthropic", {
  baseUrl: "https://proxy.example.com",
});
```

### Bash Spawn Hook

```typescript
import { createBashTool } from "@earendil-works/pi-coding-agent";

const bashTool = createBashTool(cwd, {
  spawnHook: ({ command, cwd, env }) => ({
    command: `source ~/.profile\n${command}`,
    cwd,
    env: { ...env, MY_VAR: "1" },
  }),
});

pi.registerTool({
  ...bashTool,
  execute: async (id, params, signal, onUpdate) => {
    return bashTool.execute(id, params, signal, onUpdate);
  },
});
```

### Timed Dialogs

```typescript
// Auto-cancel after 5 seconds with countdown display
const confirmed = await ctx.ui.confirm(
  "Allow?",
  "Auto-blocks in 5 seconds",
  { timeout: 5000 }
);

// Manual control with AbortSignal
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
const choice = await ctx.ui.select("Pick:", ["A", "B"], { signal: controller.signal });
```

### Runtime Reload

```typescript
// Command that reloads extensions/skills/prompts/themes
pi.registerCommand("reload", {
  handler: async (_args, ctx) => {
    await ctx.reload();
  },
});

// LLM tool that queues reload as follow-up
pi.registerTool({
  name: "reload_runtime",
  async execute() {
    pi.sendUserMessage("/reload", { deliverAs: "followUp" });
    return { content: [{ type: "text", text: "Queued reload" }] };
  },
});
```

### Preset System

```typescript
pi.registerFlag("preset", {
  description: "Start with a named preset",
  type: "string",
});

pi.registerCommand("preset", {
  handler: async (args, ctx) => {
    const presets = loadPresets(ctx.cwd);
    const name = args.trim() || await ctx.ui.select("Preset:", Object.keys(presets));
    if (!name || !presets[name]) return;

    const p = presets[name];
    if (p.provider && p.model) {
      const model = ctx.modelRegistry.find(p.provider, p.model);
      if (model) await pi.setModel(model);
    }
    if (p.thinkingLevel) pi.setThinkingLevel(p.thinkingLevel);
    if (p.tools) pi.setActiveTools(p.tools);
  },
});

// Cycle presets with shortcut
pi.registerShortcut("ctrl+shift+u", {
  description: "Cycle presets",
  handler: async (ctx) => { /* ... */ },
});
```
