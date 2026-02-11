# Production Patterns

Advanced architectural patterns from real-world extensions.

---

## Multi-Mode Session Management

**From:** `pi-interactive-shell`

Manage subprocesses with multiple interaction modes.

```typescript
type Mode = "interactive" | "hands-free" | "dispatch";

interface SessionConfig {
  mode: Mode;
  autoExitOnQuiet: boolean;
  maxOutputChars: number;
}

// Mode transitions with guards
function canTransition(from: Mode, to: Mode): boolean {
  return {
    "dispatch→background": true,
    "hands-free→interactive": true,
    "interactive→background": true,
  }[`${from}→${to}`] ?? false;
}
```

---

## Workflow Orchestration

**From:** `pi-subagents`

Template variable system for step data flow:

```typescript
interface ChainContext {
  task: string;        // Original task
  previous: string;    // Previous output
  chain_dir: string;   // Shared files
}

function injectVars(template: string, ctx: ChainContext): string {
  return template
    .replace(/\{task\}/g, ctx.task)
    .replace(/\{previous\}/g, ctx.previous);
}
```

---

## Defensive State Machine

**From:** `plan-mode`

Strict mode isolation with progressive permission release:

```typescript
const profiles = {
  plan: {
    tools: ["read", "bash"],
    canModify: false,
  },
  execution: {
    tools: ["read", "bash", "edit"],
    canModify: true,
  },
};

pi.on("tool_call", (event) => {
  if (!profiles[currentMode].tools.includes(event.toolName)) {
    return { block: true, reason: "Not allowed in current mode" };
  }
});
```

---

## Memory Systems

**From:** `role-persona`

Automated memory extraction and retrieval:

```typescript
interface AutoExtractionConfig {
  model: string;
  maxItems: number;
  intervalMs: number;
  forceKeywords: RegExp;
}

function shouldExtract(messages: Message[], config: Config): boolean {
  if (config.forceKeywords.test(extractText(messages))) return true;
  if (pendingTurns >= config.batchTurns) return true;
  return false;
}
```

---

## Complete Production Example

```typescript
export default function sophisticatedExtension(pi: ExtensionAPI) {
  // Multi-layer state
  const ephemeral = { currentOp: null };
  let sessionState = loadInitialState();

  // Mode management
  let mode: Mode = "normal";

  // Event: Lifecycle
  pi.on("session_start", restoreState);
  pi.on("session_before_tree", backupState);

  // Event: Safety guards
  pi.on("tool_call", enforceModeRestrictions);

  // Tool: Async with progress
  pi.registerTool({
    name: "long_operation",
    async execute(_id, params, signal, onUpdate) {
      for (let i = 0; i < 10; i++) {
        if (signal.aborted) break;
        onUpdate?.({ content: [{ type: "text", text: `Step ${i}` }] });
        await delay(1000);
      }
      return { content: [{ type: "text", text: "Done" }] };
    },
  });

  // Command: Multi-step wizard
  pi.registerCommand("wizard", {
    handler: async (_args, ctx) => {
      const step1 = await ctx.ui.input("Step 1:");
      const step2 = await ctx.ui.select("Step 2:", ["A", "B"]);
      // ... execute workflow
    },
  });
}
```

---

*Reference: [API Documentation](../references/api.md)*
