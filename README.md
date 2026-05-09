# Pi Extensions Skill

> A comprehensive, progressive learning guide for creating [Pi](https://pi.dev) coding agent extensions.

[![Pi](https://img.shields.io/badge/Pi-Extension%20Development-blue)](https://pi.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What is this Skill?

This is a **Skill** (Markdown documentation) that teaches you how to build **Extensions** (TypeScript code).

| Concept | Location | Purpose |
|---------|----------|---------|
| **Skill** (this) | `skills/` | Markdown docs that tell Pi "how to do X" |
| **Extension** | `extensions/` | TypeScript code that runs at runtime |

## Installation

```bash
# Install this skill to Pi's skills directory
git clone https://github.com/dwsy/pi-extensions-skill.git \
  ~/.pi/agent/skills/pi-extensions

# Or copy to project-level skills
cp -r ~/.pi/agent/skills/pi-extensions /path/to/project/.pi/skills/
```

Pi auto-discovers skills. Once installed, it loads this skill when you mention "extension development".

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

## Extension Storage Locations

Extensions you create go here (different from this skill!):

```
~/.pi/agent/extensions/    ← Global extensions (available to all projects)
.pi/extensions/            ← Project extensions (local to project)
```

## Quick Test: Create a Sample Extension

> **Note**: This creates an **Extension**, not a Skill. They are separate things.

```bash
# 1. Create the extension file
mkdir -p ~/.pi/agent/extensions
cat > ~/.pi/agent/extensions/hello.ts << 'EOF'
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Hello from Pi Extensions!", "success");
    },
  });
}
EOF

# 2. Test it (use -e for temporary load, or just restart Pi)
pi -e ~/.pi/agent/extensions/hello.ts
# Then type: /hello
```

## Directory Structure

```
pi-extensions-skill/
├── SKILL.md                    # Skill entry point (this enables the skill)
├── README.md                   # This file
├── ARCHITECTURE.md             # Extension architecture (required reading)
├── PATTERNS.md                 # 24 copy-paste patterns
├── ANTI-PATTERNS.md           # 15 common mistakes with fixes
├── guides/
│   ├── 01-quickstart.md       # Beginner tutorial
│   ├── 02-paradigms.md        # Core paradigms
│   ├── 03-state.md            # State management
│   ├── 04-production.md       # Production architecture
│   └── ...                    # More guides
└── references/
    └── api.md                 # API reference
```

## Featured Patterns

### Multi-Mode Session Management
From `pi-interactive-shell`: Managing subprocesses with interactive/hands-free/dispatch modes.

### Workflow Orchestration
From `pi-subagents`: Chain and parallel execution with template variables.

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
