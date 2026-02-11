# Core Paradigms

Pi extensions support four fundamental paradigms. Master these to build any extension.

---

## Tools (Functional)

**Purpose:** Let the LLM call custom functions.

**Pattern:** Declarative schema → Pure execution → Structured result

```typescript
import { Type } from "@sinclair/typebox";

pi.registerTool({
  name: "fetch_data",
  label: "Fetch Data",
  description: "Retrieve data from API",
  parameters: Type.Object({
    url: Type.String(),
    method: Type.String({ enum: ["GET", "POST"] }),
  }),
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // Report progress
    onUpdate?.({ content: [{ type: "text", text: "Fetching..." }] });
    
    const data = await fetch(params.url, { signal });
    
    return {
      content: [{ type: "text", text: await data.text() }],
      details: { status: data.status },
    };
  },
  renderCall(args, theme) {
    return new Text(theme.fg("accent", `fetch ${args.url}`));
  },
  renderResult(result, options, theme) {
    return new Text(options.expanded ? "Full data" : "Summary");
  },
});
```

**Key Concepts:**
- `parameters`: TypeBox schema for validation
- `onUpdate`: Stream progress to LLM
- `details`: Store structured data for recovery
- Custom renderers for better UX

---

## Commands (Imperative)

**Purpose:** User-triggered actions via `/command`.

**Pattern:** Parse args → Validate → Execute → Notify

```typescript
pi.registerCommand("deploy", {
  description: "Deploy to environment",
  getArgumentCompletions: (prefix) => [
    { value: "staging", label: "Staging environment" },
    { value: "production", label: "Production (careful!)" },
  ],
  handler: async (args, ctx) => {
    const env = args.trim() || "staging";
    
    // Confirm dangerous actions
    if (env === "production") {
      const ok = await ctx.ui.confirm(
        "Deploy to production?",
        "This affects live users."
      );
      if (!ok) return;
    }
    
    ctx.ui.setStatus("deploy", `Deploying to ${env}...`);
    
    try {
      await deploy(env);
      ctx.ui.notify(`Deployed to ${env}`, "success");
    } catch (error) {
      ctx.ui.notify(`Deploy failed: ${error}`, "error");
    } finally {
      ctx.ui.setStatus("deploy", undefined);
    }
  },
});
```

**Key Concepts:**
- `getArgumentCompletions`: Auto-complete user input
- `ctx.ui.confirm`: Block for user approval
- `ctx.ui.setStatus`: Show persistent status

---

## Event Handlers (Reactive)

**Purpose:** React to system events, intercept/modify behavior.

### Tool Call Interception

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName === "bash") {
    const cmd = event.input.command;
    
    // Block dangerous commands
    if (cmd.includes("rm -rf /")) {
      return {
        block: true,
        reason: "This would delete your entire system!",
      };
    }
    
    // Log for audit
    console.log(`[Audit] ${cmd}`);
  }
});
```

### Tool Result Modification

```typescript
pi.on("tool_result", async (event) => {
  if (event.toolName === "read" && event.input.path.endsWith(".json")) {
    // Pretty-print JSON
    const text = event.content[0]?.text;
    if (text) {
      const pretty = JSON.stringify(JSON.parse(text), null, 2);
      return { content: [{ type: "text", text: pretty }] };
    }
  }
});
```

### Session Lifecycle

```typescript
pi.on("session_start", async (_event, ctx) => {
  ctx.ui.notify("Session started", "info");
});

pi.on("agent_end", async (event, ctx) => {
  const msgCount = event.messages.length;
  console.log(`Turn ended with ${msgCount} messages`);
});
```

**Event Types:**
- Session: `session_start`, `session_shutdown`, `session_switch`
- Agent: `before_agent_start`, `agent_start`, `agent_end`
- Turn: `turn_start`, `turn_end`
- Tools: `tool_call`, `tool_result`
- Input: `input`, `user_bash`, `context`

---

## Custom UI (Declarative)

**Purpose:** Build interactive terminal interfaces.

### Simple Dialog

```typescript
const choice = await ctx.ui.select("Choose:", ["A", "B", "C"]);
const confirmed = await ctx.ui.confirm("Sure?", "This deletes data");
const input = await ctx.ui.input("Name:", "placeholder");
const text = await ctx.ui.editor("Edit:", "prefilled");
```

### Custom Component

```typescript
import { Container, Text, SelectList } from "@mariozechner/pi-tui";

const result = await ctx.ui.custom<string>((tui, theme, _kb, done) => {
  const container = new Container();
  
  container.addChild(new Text(theme.fg("accent", "My Component")));
  
  const items = [{ value: "a", label: "Option A" }];
  const list = new SelectList(items, 5, {
    selectedText: (t) => theme.fg("accent", t),
  });
  list.onSelect = (item) => done(item.value);
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
}, { overlay: true });
```

### Widget

```typescript
// Persistent widget
ctx.ui.setWidget("my-widget", [
  theme.fg("accent", "Status: Active"),
  theme.fg("dim", "Last update: 5s ago"),
]);

// Or dynamic component
ctx.ui.setWidget("dynamic", (tui, theme) => ({
  render(w) {
    return [theme.fg("accent", `Time: ${Date.now()}`)];
  },
  invalidate() {},
}));
```

---

## Choosing the Right Paradigm

```
Need LLM to perform action? ──► Tool
Need user shortcut? ──────────► Command
Need to intercept/modify? ────► Event Handler
Need interactive UI? ─────────► Custom UI
```

## Combining Paradigms

```typescript
export default function (pi: ExtensionAPI) {
  const state = { count: 0 };

  // Event: Track usage
  pi.on("agent_start", () => state.count++);

  // Tool: LLM uses this
  pi.registerTool({
    name: "get_count",
    async execute() {
      return {
        content: [{ type: "text", text: `Count: ${state.count}` }],
      };
    },
  });

  // Command: User checks this
  pi.registerCommand("count", {
    handler: async (_args, ctx) => {
      ctx.ui.notify(`Commands: ${state.count}`, "info");
    },
  });
}
```

---

**Next:** Learn to persist state across sessions → [State Management](03-state.md)
