# Quickstart: Your First Extension

> **Goal:** Build a working extension in 5 minutes.

## Step 1: Create Extension File

```bash
cat > ~/.pi/agent/extensions/my-first.ts << 'EOF'
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Register a simple command
  pi.registerCommand("greet", {
    description: "Greet the user",
    handler: async (args, ctx) => {
      const name = args.trim() || "World";
      ctx.ui.notify(`Hello, ${name}! 👋`, "success");
    },
  });
}
EOF
```

## Step 2: Test It

```bash
pi -e ~/.pi/agent/extensions/my-first.ts
```

In the pi session, type:
```
/greet Alice
```

## Step 3: Add a Tool

```typescript
import { Type } from "@sinclair/typebox";

pi.registerTool({
  name: "calculate",
  label: "Calculator",
  description: "Perform calculations",
  parameters: Type.Object({
    expression: Type.String({ description: "Math expression" }),
  }),
  async execute(_id, params) {
    const result = eval(params.expression); // Simple eval for demo
    return {
      content: [{ type: "text", text: `Result: ${result}` }],
    };
  },
});
```

Test it by asking the LLM: "Use the calculate tool to compute 2 + 2"

## Step 4: Add Event Handler

```typescript
// Log all bash commands
pi.on("tool_call", async (event) => {
  if (event.toolName === "bash") {
    console.log(`[Bash] ${event.input.command}`);
  }
});
```

## Complete Example

```typescript
import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  let commandCount = 0;

  // Command
  pi.registerCommand("stats", {
    description: "Show extension stats",
    handler: async (_args, ctx) => {
      ctx.ui.notify(`Commands executed: ${commandCount}`, "info");
    },
  });

  // Tool
  pi.registerTool({
    name: "echo",
    label: "Echo",
    description: "Echo back the input",
    parameters: Type.Object({
      message: Type.String(),
    }),
    async execute(_id, params) {
      return {
        content: [{ type: "text", text: params.message }],
      };
    },
  });

  // Event: Track commands
  pi.on("agent_start", async () => {
    commandCount++;
  });
}
```

## What's Next?

- Learn the **4 core paradigms**: [→ Core Paradigms](02-paradigms.md)
- Study **real examples**: [→ Example Gallery](../examples/gallery.md)
- Dive into **state management**: [→ State](03-state.md)

## Common Issues

| Issue | Solution |
|-------|----------|
| `Cannot find module` | Ensure `@mariozechner/pi-coding-agent` is available |
| Command not found | Check `pi -e` loaded the file correctly |
| UI methods fail | Check `ctx.hasUI` before using UI |
