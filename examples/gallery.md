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

### Loop Extension (`~/.pi/agent/extensions/loop.ts`)

**Features:**
- Autonomous loop execution with breakout conditions
- Custom tool (`signal_loop_success`) to terminate loop
- Compaction hook preservation
- State reconstruction across sessions

**Key Patterns:**

```typescript
// Custom termination tool
pi.registerTool({
  name: "signal_loop_success",
  label: "标记循环成功",
  description: "当跳出条件满足时停止当前循环",
  parameters: Type.Object({}),
  async execute(_id, _params, _signal, _onUpdate, ctx) {
    clearLoopState(ctx);
    return { content: [{ type: "text", text: "循环已结束" }] };
  },
});

// Trigger follow-up prompt automatically
pi.sendMessage({
  customType: "loop",
  content: loopState.prompt,
  display: true,
}, {
  deliverAs: "followUp",
  triggerTurn: true,
});

// Preserve loop state during compaction
pi.on("session_before_compact", async (event, ctx) => {
  const instructionParts = [
    event.customInstructions,
    getCompactionInstructions(loopState.mode, loopState.condition),
  ].filter(Boolean).join("\n\n");
  // ...
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

### Output Styles (`~/.pi/agent/extensions/output-styles.ts`)

**Features:**
- Markdown-based style definitions with YAML frontmatter
- Template engine with `{{#if}}` / `{{#unless}}` / `{{var}}`
- Interactive feature toggle panel (tabs, toggles, sliders)
- Project-local and global style scopes
- System prompt injection via `before_agent_start`

**Key Patterns:**

```typescript
// Inject style into system prompt
pi.on("before_agent_start", async (event, ctx) => {
  const style = findOutputStyle(ctx.cwd, activeStyleName);
  if (!style) return;
  const systemPrompt = generateStyleSystemPrompt(style);
  return { systemPrompt: `${event.systemPrompt}\n\n${systemPrompt}` };
});

// Multi-section toggle panel inside custom()
const panel = createTogglePanel(ctx, style, theme);
// handleInput switches sections with ←→, navigates with ↑↓,
// toggles with Space/Enter
```

---

### Q&A Extraction (`~/.pi/agent/extensions/qna.ts`)

**Features:**
- Extracts questions from last assistant message
- Cost-efficient model switching (Opus/Sonnet → Haiku)
- `BorderedLoader` for async extraction UI
- Loads result into editor

**Key Patterns:**

```typescript
// Model downgrading for cost efficiency
async function selectExtractionModel(currentModel, registry) {
  if (currentModel.provider === "anthropic" &&
      (currentModel.id.includes("opus") || currentModel.id.includes("sonnet"))) {
    const haiku = registry.find("anthropic", "claude-haiku-4-5");
    if (haiku) {
      const auth = await registry.getApiKeyAndHeaders(haiku);
      if (auth.ok && auth.apiKey) return haiku;
    }
  }
  return currentModel;
}

// Async work inside BorderedLoader
const result = await ctx.ui.custom((tui, theme, _kb, done) => {
  const loader = new BorderedLoader(tui, theme, "Extracting...");
  loader.onAbort = () => done(null);
  doExtract().then(done).catch(() => done(null));
  return loader;
});
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

### Safety Gates (`~/.pi/agent/extensions/safety-gates.ts`)

**Features:**
- `rm` command detection with regex precision
- Countdown timer in custom TUI component
- Auto-block on timeout
- Exception paths (`/tmp/`, `/var/cache/`)

**Key Patterns:**

```typescript
// Precise rm detection (not naive includes)
const rmPattern = /(^|[;&|]\s*)(sudo\s+)?rm(\s|$)/;

// Timer-based custom confirmation
const result = await ctx.ui.custom<boolean>((tui, theme, _kb, done) => {
  let remaining = 30;
  const timer = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(timer);
      done(false);
    } else {
      tui.requestRender();
    }
  }, 1000);
  // ...
});
```

---

## Providers

### Kilo Provider (`~/.pi/agent/extensions/kilo-pi-provider/kilo.ts`)

**Features:**
- Device authorization flow (browser-based login)
- Dynamic model fetching (free vs full)
- OAuth with `modifyModels` fallback strategy
- `session_start` re-registration for logged-in users

**Key Patterns:**

```typescript
// Device code OAuth flow
async function loginKilo(callbacks) {
  const authData = await initiateDeviceAuth();
  callbacks.onAuth({
    url: authData.verificationUrl,
    instructions: `Enter code: ${authData.code}`,
  });
  // Poll until approved/denied/expired
}

// Free models at startup, full models after login
let cachedAllModels: ProviderModelConfig[] = [];

pi.registerProvider("kilo", {
  baseUrl: KILO_GATEWAY_BASE,
  apiKey: "KILO_API_KEY",
  api: "openai-completions",
  models: freeModels,
  oauth: {
    name: "Kilo",
    login: async (callbacks) => {
      const cred = await loginKilo(callbacks);
      cachedAllModels = await fetchKiloModels({ token: cred.access });
      return cred;
    },
    modifyModels: (models, _cred) => {
      if (cachedAllModels.length === 0) return models;
      // rebuild with cached full model list
      return [...nonKilo, ...fullModels];
    },
  },
});
```

---

### Model Providers (`~/.pi/agent/extensions/model-providers/index.ts`)

**Features:**
- Adapter-based provider loading
- Provider context rewriting (e.g., developer → system role)
- Dynamic re-registration on `session_start`

**Key Patterns:**

```typescript
// Context rewriting per provider
pi.on("context", async (event, ctx) => {
  const model = ctx.model;
  if (!model || !oauthProviders.includes(model.provider)) return;

  const rewritten = event.messages.map((m) => {
    if ((m as any).role !== "developer") return m;
    return { ...(m as any), role: "system" };
  });

  return { messages: rewritten as any };
});
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

### Recipe: Cost-Efficient Model Fallback

```typescript
async function getCheapModel(ctx: ExtensionContext) {
  const current = ctx.model;
  if (!current || current.provider !== "anthropic") return current;

  const haiku = ctx.modelRegistry.find("anthropic", "claude-haiku-4-5");
  if (haiku) {
    const auth = await ctx.modelRegistry.getApiKeyAndHeaders(haiku);
    if (auth.ok && auth.apiKey) return haiku;
  }
  return current;
}
```

---

*Back to [Quickstart](../guides/01-quickstart.md)*
