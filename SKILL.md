---
name: pi-extensions
description: |
  Pi extension development master reference.
  Use when: building pi extensions, debugging extension behavior, or choosing the right pattern.
---

# Pi Extensions — LLM Master Reference

## Start Here (Read Order)

| Priority | Document | Read When |
|----------|----------|-----------|
| **1** | [`ARCHITECTURE.md`](ARCHITECTURE.md) | Before writing ANY extension code |
| **2** | [`PATTERNS.md`](PATTERNS.md) | When you need copy-paste code for a specific task |
| **3** | [`ANTI-PATTERNS.md`](ANTI-PATTERNS.md) | When reviewing or debugging extension code |

The `guides/` and `references/` directories contain deeper narratives and examples. Use them after scanning the three master docs above.

---

## One-Line Directives

- **Writing a new extension?** → Read [`ARCHITECTURE.md`](ARCHITECTURE.md) §1–§5, then copy the matching pattern from [`PATTERNS.md`](PATTERNS.md).
- **Extension is broken?** → Check [`ANTI-PATTERNS.md`](ANTI-PATTERNS.md) first.
- **Need TUI component?** → [`PATTERNS.md`](PATTERNS.md) §P12–§P14, then [`guides/02-paradigms.md`](guides/02-paradigms.md) for narrative.
- **Need custom provider/OAuth?** → [`PATTERNS.md`](PATTERNS.md) §P19–§P20, then [`guides/07-advanced-patterns.md`](guides/07-advanced-patterns.md).
- **Need event semantics?** → [`ARCHITECTURE.md`](ARCHITECTURE.md) §5, then [`references/events.md`](references/events.md).
- **Need RPC safety?** → [`ANTI-PATTERNS.md`](ANTI-PATTERNS.md) §A2, then [`guides/05-rpc-mode.md`](guides/05-rpc-mode.md).

---

## Master Decision Trees

### Which document do I need?

```
I need to understand how extensions work
  └─► ARCHITECTURE.md

I need working code to copy
  └─► PATTERNS.md

I need to know what NOT to do
  └─► ANTI-PATTERNS.md

I need a step-by-step first tutorial
  └─► guides/01-quickstart.md

I need deep narrative on tools/events/UI
  └─► guides/02-paradigms.md

I need state persistence strategies
  └─► guides/03-state.md

I need production architecture (workflows, memory)
  └─► guides/04-production.md

I need RPC mode specifics
  └─► guides/05-rpc-mode.md

I need pi internals (loader, runner, binding)
  └─► guides/06-internals.md

I need provider plugins, OAuth, overrides
  └─► guides/07-advanced-patterns.md
```

### Which paradigm should I use?

```
Need LLM to perform action? ───────────────► Tool (PATTERNS P2–P5)
Need user to type /command? ───────────────► Command (PATTERNS P6–P7)
Need keyboard shortcut? ───────────────────► Shortcut (guides/02-paradigms.md)
Need to react to system events? ───────────► Event handler (PATTERNS P8–P11)
Need interactive TUI? ─────────────────────► Custom UI (PATTERNS P12–P14)
Need to inject a model provider? ──────────► registerProvider (PATTERNS P19–P20)
Need to override a built-in tool? ─────────► Tool override (PATTERNS P4)
```

### Which state persistence mechanism?

```
State should go to LLM context? ───────────► sendMessage({ customType, ... })
State is extension-private? ───────────────► appendEntry("customType", data)
State is user preference (cross-project)? ─► File in ~/.pi/agent/
State is project-local? ───────────────────► File in .pi/
State is temporary cache? ─────────────────► Local variable (reconstructed on reload)
```

---

## Document Map

### Master References (Read First)

| File | Purpose | Length |
|------|---------|--------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Mental model, execution flow, exact event semantics | ~9KB |
| [`PATTERNS.md`](PATTERNS.md) | 24 copy-paste patterns with exact imports | ~14KB |
| [`ANTI-PATTERNS.md`](ANTI-PATTERNS.md) | 15 common mistakes with corrections | ~9KB |

### Progressive Guides (Read as Needed)

| File | Level | Topic |
|------|-------|-------|
| [`guides/01-quickstart.md`](guides/01-quickstart.md) | 🌱 Beginner | First extension in 5 minutes |
| [`guides/02-paradigms.md`](guides/02-paradigms.md) | 🌿 Intermediate | Tools, commands, events, UI deep dive |
| [`guides/03-state.md`](guides/03-state.md) | 🌳 Advanced | Persistent and branch-resilient state |
| [`guides/04-production.md`](guides/04-production.md) | 🏔️ Expert | Multi-mode, workflows, memory systems |
| [`guides/05-rpc-mode.md`](guides/05-rpc-mode.md) | 🔌 RPC | RPC mode compatibility and degradation |
| [`guides/06-internals.md`](guides/06-internals.md) | ⚙️ Internals | Loader, runner, event dispatch, binding |
| [`guides/07-advanced-patterns.md`](guides/07-advanced-patterns.md) | 🚀 Advanced | Provider plugins, OAuth, tool overrides, file mutation queues |

### Reference Docs

| File | Purpose |
|------|---------|
| [`references/api.md`](references/api.md) | Complete API documentation |
| [`references/api-quickref.md`](references/api-quickref.md) | Quick reference card |
| [`references/events.md`](references/events.md) | Full event reference |
| [`references/examples.md`](references/examples.md) | Additional code examples |
| [`references/ui-components.md`](references/ui-components.md) | TUI component catalog |
| [`references/source-patterns.md`](references/source-patterns.md) | Patterns extracted from pi source |

### Examples

| File | Purpose |
|------|---------|
| [`examples/gallery.md`](examples/gallery.md) | Annotated real-world extensions |

---

## 5-Minute Quick Test

```bash
mkdir -p ~/.pi/agent/extensions
cat > ~/.pi/agent/extensions/hello.ts << 'EOF'
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Hello from Pi Extensions!", "success");
    },
  });
}
EOF

pi -e ~/.pi/agent/extensions/hello.ts
# Then type: /hello
```

---

## Quick Import Cheat Sheet

```typescript
// Core types
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

// Schema
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";

// TUI
import { Container, Text, SelectList } from "@mariozechner/pi-tui";

// Utilities
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType, isBashToolResult } from "@mariozechner/pi-coding-agent";
```

---

## Hot Topics

### Dynamic Model Injection
Use `pi.registerProvider()` for proxies, custom endpoints, or team-wide model configs. See [`PATTERNS.md`](PATTERNS.md) §P19–P20 and [`guides/07-advanced-patterns.md`](guides/07-advanced-patterns.md).

### Tool Override
Register a tool with the same name as a built-in (`read`, `bash`, `edit`, `write`) to wrap or replace it. See [`PATTERNS.md`](PATTERNS.md) §P4.

### Parallel Execution Safety
Custom tools that mutate files must use `withFileMutationQueue()` to avoid race conditions with built-in `edit`/`write`. See [`PATTERNS.md`](PATTERNS.md) §P5 and [`ANTI-PATTERNS.md`](ANTI-PATTERNS.md) §A4.

### RPC Safety
`ctx.hasUI` is `true` in RPC, but `custom()` returns `undefined`. Use `select`/`confirm`/`input`/`editor` for blocking dialogs that work in both modes. See [`ANTI-PATTERNS.md`](ANTI-PATTERNS.md) §A2 and [`guides/05-rpc-mode.md`](guides/05-rpc-mode.md).

---

*Master references: [ARCHITECTURE](ARCHITECTURE.md) · [PATTERNS](PATTERNS.md) · [ANTI-PATTERNS](ANTI-PATTERNS.md)*
