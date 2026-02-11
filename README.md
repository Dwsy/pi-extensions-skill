# Pi Extensions Skill

> A comprehensive, progressive learning guide for creating [Pi](https://pi.dev) coding agent extensions.

[![Pi](https://img.shields.io/badge/Pi-Extension%20Development-blue)](https://pi.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

This skill provides a structured learning path for developing Pi extensions—from your first "Hello World" to production-grade multi-mode session managers.

## Quick Start

```bash
# Clone the skill
git clone https://github.com/dwsy/pi-extensions-skill.git ~/.pi/agent/skills/pi-extensions

# Create your first extension
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

# Run it
pi -e ~/.pi/agent/extensions/hello.ts
# Then type: /hello
```

## Learning Path

| Level | Document | Description |
|-------|----------|-------------|
| 🌱 Beginner | [Quickstart](guides/01-quickstart.md) | First extension in 5 minutes |
| 🌿 Intermediate | [Core Paradigms](guides/02-paradigms.md) | Tools, Commands, Events, UI |
| 🌳 Advanced | [State Management](guides/03-state.md) | Persistent and cross-session state |
| 🏔️ Expert | [Production Patterns](guides/04-production.md) | Multi-mode, workflows, memory systems |
| 📚 Reference | [API Reference](references/api.md) | Complete API documentation |
| 🧩 Examples | [Real Extensions](examples/gallery.md) | Annotated production code |

## What are Pi Extensions?

Pi extensions are TypeScript modules that hook into the Pi coding agent lifecycle:

- **Tools**: Let the LLM call custom functions
- **Commands**: User-triggered actions via `/command`
- **Event Handlers**: React to and intercept system events
- **Custom UI**: Build interactive terminal interfaces

## Architecture

```
SKILL.md                    # Entry point with decision tree
guides/
├── 01-quickstart.md        # First extension
├── 02-paradigms.md         # Core patterns
├── 03-state.md             # State management
└── 04-production.md        # Advanced architectures
references/
└── api.md                  # API reference
examples/
└── gallery.md              # Real-world examples
assets/
└── templates/              # Starter templates
```

## Installation

### As a Pi Skill

```bash
# Clone to Pi skills directory
git clone https://github.com/dwsy/pi-extensions-skill.git \
  ~/.pi/agent/skills/pi-extensions
```

Then reference it in your Pi agent.

### Standalone Reference

Browse the guides directly—each is self-contained with runnable examples.

## Featured Patterns

### Multi-Mode Session Management
From `pi-interactive-shell`: Managing subprocesses with interactive/hands-free/dispatch modes.

### Workflow Orchestration
From `pi-subagents`: Chain and parallel execution with template variables (`{task}`, `{previous}`).

### Defensive State Machine
From `plan-mode`: Strict mode isolation with progressive permission release.

### Hierarchical Memory System
From `role-persona`: Automated extraction, tagging, and contextual retrieval.

## Contributing

This skill is extracted from real production extensions. Contributions welcome:

1. Add new patterns from your extensions
2. Improve examples
3. Fix bugs or clarify documentation

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Credits

Patterns derived from studying these production extensions:

- [pi-interactive-shell](https://github.com/marckrenn/pi-interactive-shell)
- [pi-subagents](https://github.com/marckrenn/pi-subagents)
- [pi-fzf](https://github.com/juanibiapina/pi-fzf)
- [pi-annotate](https://github.com/tmustier/pi-annotate)
- And more in [examples/gallery.md](examples/gallery.md)

## License

MIT © [dwsy](https://github.com/dwsy)

---

> **The journey of a thousand miles begins with a single step.** — Laozi

[Start your journey →](guides/01-quickstart.md)
