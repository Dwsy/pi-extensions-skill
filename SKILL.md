---
name: pi-extensions
description: Progressive learning guide for Pi extension development. Start with quickstart, then explore paradigms, advanced patterns, and production architectures.
---

# Pi Extensions - Progressive Learning Path

> **The journey of a thousand miles begins with a single step.** — Laozi

## Quick Navigation

| Level | Document | Purpose |
|-------|----------|---------|
| 🌱 Beginner | [Quickstart](guides/01-quickstart.md) | First extension in 5 minutes |
| 🌿 Intermediate | [Core Paradigms](guides/02-paradigms.md) | Tools, Commands, Events, UI |
| 🌳 Advanced | [State Management](guides/03-state.md) | Persistent and cross-session state |
| 🏔️ Expert | [Production Patterns](guides/04-production.md) | Multi-mode, workflows, memory systems |
| 📚 Reference | [API Reference](references/api.md) | Complete API documentation |
| 🧩 Examples | [Real Extensions](examples/gallery.md) | Annotated production code |

## Decision Tree - Where to Start?

```
Your Goal
│
├─► First extension ───────────────► [Quickstart](guides/01-quickstart.md)
│
├─► Add LLM capability ────────────► [Tools](guides/02-paradigms.md#tools)
│
├─► Add slash command ─────────────► [Commands](guides/02-paradigms.md#commands)
│
├─► Intercept/modify behavior ─────► [Event Handlers](guides/02-paradigms.md#events)
│
├─► Build interactive UI ──────────► [Custom UI](guides/02-paradigms.md#ui)
│
├─► Manage complex state ──────────► [State Management](guides/03-state.md)
│
├─► Multi-mode session handling ───► [Production: Multi-Mode](guides/04-production.md#multi-mode)
├─► Workflow orchestration ────────► [Production: Workflows](guides/04-production.md#workflows)
├─► Memory/learning systems ───────► [Production: Memory](guides/04-production.md#memory)
│
└─► Study real examples ───────────► [Example Gallery](examples/gallery.md)
```

## Prerequisites

```bash
# Ensure pi CLI is installed
pi --version

# Create extensions directory
mkdir -p ~/.pi/agent/extensions
```

## 5-Minute Quick Test

Create `~/.pi/agent/extensions/hello.ts`:

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Hello from Pi Extensions!", "success");
    },
  });
}
```

Run it:
```bash
pi -e ~/.pi/agent/extensions/hello.ts
# Then type: /hello
```

**Next:** Continue to [Quickstart](guides/01-quickstart.md) for a complete walkthrough.

---

## Extension Type Decision Matrix

| If you want to... | Use | See |
|-------------------|-----|-----|
| Let LLM call custom function | **Tool** | [Paradigms § Tools](guides/02-paradigms.md#tools) |
| Add `/command` for user | **Command** | [Paradigms § Commands](guides/02-paradigms.md#commands) |
| React to system events | **Event Handler** | [Paradigms § Events](guides/02-paradigms.md#events) |
| Build custom TUI | **Custom UI** | [Paradigms § UI](guides/02-paradigms.md#ui) |

## Learning Path Recommendations

### Path A: Tool Builder
1. [Quickstart](guides/01-quickstart.md) - Understand basics
2. [Tools](guides/02-paradigms.md#tools) - Deep dive into tool pattern
3. [State Management](guides/03-state.md) - Persist tool results
4. [Examples: Tools](examples/gallery.md#tools) - Study real implementations

### Path B: UI Developer
1. [Quickstart](guides/01-quickstart.md) - Basic setup
2. [Custom UI](guides/02-paradigms.md#ui) - Component architecture
3. [Production: TUI Patterns](guides/04-production.md#tui-patterns) - Advanced techniques
4. [Examples: UI](examples/gallery.md#ui) - Real TUI extensions

### Path C: Systems Engineer
1. [Quickstart](guides/01-quickstart.md) - Foundation
2. [Event Handlers](guides/02-paradigms.md#events) - Interception patterns
3. [State Management](guides/03-state.md) - Complex state machines
4. [Production Patterns](guides/04-production.md) - Enterprise architecture

## Common Patterns Quick Reference

```typescript
// Pattern: Tool with progress
pi.registerTool({
  name: "process",
  async execute(_id, params, signal, onUpdate, ctx) {
    onUpdate({ content: [{ type: "text", text: "Starting..." }] });
    // ... do work
    return { content: [{ type: "text", text: "Done" }] };
  },
});

// Pattern: Command with confirmation
pi.registerCommand("dangerous", {
  handler: async (_args, ctx) => {
    const ok = await ctx.ui.confirm("Sure?", "This cannot be undone");
    if (!ok) return;
    // ... proceed
  },
});

// Pattern: Event interception
pi.on("tool_call", async (event) => {
  if (event.toolName === "bash" && event.input.command.includes("rm")) {
    return { block: true, reason: "Use trash instead" };
  }
});

// Pattern: Persistent state
pi.appendEntry("my-state", { count: 42 });
```

---

## Directory Structure

```
~/.pi/agent/skills/pi-extensions/
├── SKILL.md                    # This file - entry point
├── guides/
│   ├── 01-quickstart.md        # First extension
│   ├── 02-paradigms.md         # Core patterns
│   ├── 03-state.md             # State management
│   └── 04-production.md        # Advanced architectures
├── references/
│   ├── api.md                  # Complete API
│   ├── events.md               # Event reference
│   └── troubleshooting.md      # Common issues
└── examples/
    ├── gallery.md              # Extension showcase
    ├── templates/              # Starter templates
    └── recipes/                # Copy-paste solutions
```

---

*Start your journey: [Quickstart →](guides/01-quickstart.md)*
