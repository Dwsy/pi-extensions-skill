# Extension Gallery

Real extensions with annotated source code.

---

## Tools

### pi-threads: Session Search

**Features:**
- Ripgrep-powered session search
- Custom tool renderers
- Session tree reconstruction

**Key Pattern:** Tool with expanded/collapsed views

```typescript
renderResult(result, { expanded }, theme) {
  if (expanded) {
    return fullSessionView(result);
  }
  return summaryView(result);
}
```

---

### pi-annotate: Visual Annotation

**Features:**
- Unix socket communication
- Chrome extension integration
- Binary data handling (screenshots)

**Key Pattern:** External process coordination

```typescript
const socket = net.createConnection(SOCKET_PATH);
socket.on("data", (data) => {
  // Handle messages from browser
});
```

---

## Commands

### pi-fzf: Fuzzy Finder

**Features:**
- Dynamic command registration
- Config file loading
- Fuzzy selector component

**Key Pattern:** Config-driven commands

```typescript
// Load config and register commands dynamically
for (const cmd of config.commands) {
  pi.registerCommand(`fzf:${cmd.name}`, { /* ... */ });
}
```

---

### pi-doom: Game Integration

**Features:**
- DOOM engine in terminal
- Persistent engine instance
- Custom TUI component with input handling

**Key Pattern:** Long-running external process

```typescript
// Reuse engine instance
if (activeEngine && activeWadPath === wad) {
  // Resume existing
} else {
  activeEngine = new DoomEngine(wad);
}
```

---

## Event Handlers

### pi-watch: File Watcher

**Features:**
- Chokidar file watching
- AI comment parsing
- Trigger-based execution

**Key Pattern:** Pause during agent activity

```typescript
pi.on("agent_start", () => commentWatcher?.pause());
pi.on("agent_end", () => commentWatcher?.resume());
```

---

## Complex Systems

### pi-messenger: Agent Communication

**Features:**
- File-based coordination
- Multi-agent message routing
- Crew/task orchestration

**Architecture:**
```
registry/     # Agent discovery
inbox/        # Message queues
feed.ts       # Event logging
crew/         # Task orchestration
```

### pi-subagents: Workflow Engine

**Features:**
- Chain/parallel execution
- Template variable injection
- Clarify TUI for confirmation

**Architecture:**
```
chain-execution.ts      # Sequential workflows
async-execution.ts      # Background jobs
agent-manager.ts        # Agent discovery
```

---

## Copy-Paste Recipes

### Recipe: Confirmation Guard

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName === "bash" && isDangerous(event.input.command)) {
    const ok = await ctx.ui.confirm("Dangerous!", "Proceed?");
    return ok ? undefined : { block: true, reason: "User declined" };
  }
});
```

### Recipe: Timed Confirmation Guard (RPC-safe)

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName === "bash" && isDangerous(event.input.command)) {
    if (!ctx.hasUI) return { block: true, reason: "No UI" };
    // select() works in both TUI and RPC (unlike custom())
    const choice = await ctx.ui.select(
      `⚠️ ${event.input.command}`,
      ["Allow", "Block"],
      { timeout: 30000 }
    );
    return choice === "Allow" ? undefined : { block: true, reason: "Blocked" };
  }
});
```

### Recipe: Progress Widget

```typescript
let progress = 0;
const interval = setInterval(() => {
  progress += 10;
  ctx.ui.setWidget("progress", [
    `[${"=".repeat(progress / 10)}${" ".repeat(10 - progress / 10)}]`,
  ]);
}, 1000);
```

### Recipe: Session Recovery

```typescript
function loadState(entries: SessionEntry[]): State {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].type === "custom" && entries[i].customType === "my-state") {
      return entries[i].data;
    }
  }
  return defaultState;
}
```

### Recipe: RPC Mode Guard

```typescript
export default function (pi: ExtensionAPI) {
  // Skip entirely in RPC mode (for TUI-only extensions)
  if (process.argv.includes("--mode") && process.argv.includes("rpc")) return;
  // ... extension code
}
```

### Recipe: Custom Message Renderer

```typescript
pi.registerMessageRenderer("my-type", (message, { expanded }, theme) => {
  let text = theme.fg("accent", `[${message.customType}] `) + message.content;
  if (expanded && message.details) {
    text += "\n" + theme.fg("dim", JSON.stringify(message.details, null, 2));
  }
  return new Text(text, 0, 0);
});
```

### Recipe: Inter-Extension Communication

```typescript
// Emit
pi.events.emit("my:data-ready", { path: "/tmp/result.json" });

// Listen
pi.events.on("my:data-ready", (data) => {
  const { path } = data as { path: string };
  // process...
});
```

### Recipe: Dynamic Resource Loading

```typescript
pi.on("resources_discover", () => ({
  skillPaths: [join(__dirname, "SKILL.md")],
  promptPaths: [join(__dirname, "prompts/")],
}));
```

---

*Back to [Quickstart](../guides/01-quickstart.md)*
