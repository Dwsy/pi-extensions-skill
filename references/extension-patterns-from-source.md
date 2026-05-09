# Pi Extension Patterns - Extension Source Analysis

> Knowledge extracted from analyzing popular pi extensions in the ecosystem.

---

## Multi-Agent Coordination (pi-messenger)

### Agent Registration Pattern

```typescript
import type { AgentRegistration } from "@earendil-works/pi-coding-agent";

interface AgentRegistration {
  name: string;
  pid: number;
  sessionId: string;
  cwd: string;
  model: string;
  startedAt: string;
  reservations?: FileReservation[];
  gitBranch?: string;
  spec?: string;
  isHuman: boolean;
  session: { toolCalls: number; tokens: number; filesModified: string[] };
  activity: { lastActivityAt: string; currentActivity?: string; lastToolCall?: string };
  statusMessage?: string;
}
```

### Status Computation

```typescript
type AgentStatus = "active" | "idle" | "away" | "stuck";

export const STATUS_INDICATORS: Record<AgentStatus, string> = {
  active: "●",
  idle: "○",
  away: "◌",
  stuck: "✗",
};

export function computeStatus(ctx: {
  lastActivityMs: number;
  idleThresholdMs: number;
  stuckThresholdMs: number;
  hasBlockedTask: boolean;
}): ComputedStatus {
  const { lastActivityMs, idleThresholdMs, stuckThresholdMs, hasBlockedTask } = ctx;
  const age = Date.now() - lastActivityMs;

  if (age < idleThresholdMs) return { status: "active", since: "now" };
  if (hasBlockedTask || age > stuckThresholdMs) return { status: "stuck", since: formatDuration(age) };
  return { status: "idle", since: formatDuration(age) };
}
```

### File Reservation System

```typescript
interface FileReservation {
  pattern: string;      // Glob pattern
  reason?: string;      // Why this agent needs it
  since: string;        // Timestamp
}

function pathMatchesReservation(filePath: string, pattern: string): boolean {
  // Simple glob matching
  const regex = new RegExp(
    "^" + pattern
      .replace(/\./g, "\\.")
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*") + "$"
  );
  return regex.test(filePath);
}
```

### Activity Log Rendering

```typescript
function renderActivityLog(
  tools: ToolEntry[],
  currentTool: string | undefined,
  startedAt: number,
  width: number,
): string[] {
  const lines: string[] = [];
  for (const entry of tools) {
    const elapsed = formatElapsed(entry.startMs - startedAt);
    const args = entry.args ? ` ${entry.args}` : "";
    lines.push(truncateToWidth(`  [${elapsed}] ${entry.tool}${args}`, width));
  }
  if (currentTool) {
    const elapsed = formatElapsed(Date.now() - startedAt);
    lines.push(truncateToWidth(`  → [${elapsed}] ${currentTool}`, width));
  } else {
    lines.push(`  → thinking...`);
  }
  return lines;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
}
```

### Agent Name Generation

```typescript
const ADJECTIVES = ["Swift", "Bright", "Calm", "Bold", "Keen", "Wise"];
const ANIMALS = ["Fox", "Owl", "Wolf", "Bear", "Hawk", "Lynx"];

export function generateMemorableName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj}${animal}`;
}
```

---

## Diff Presentation (pi-tool-display)

### Adaptive Diff Mode Selection

```typescript
type DiffPresentationMode = "split" | "unified" | "compact" | "summary";
const MIN_COMPACT_DIFF_WIDTH = 8;
const MIN_UNIFIED_DIFF_WIDTH = 18;

export function resolveDiffPresentationMode(
  config: { diffViewMode: "auto" | "split" | "unified"; diffSplitMinWidth: number },
  width: number,
  canRenderSplitLayout: boolean,
): DiffPresentationMode {
  if (width < MIN_COMPACT_DIFF_WIDTH) return "summary";
  if (width < MIN_UNIFIED_DIFF_WIDTH) return "compact";

  switch (config.diffViewMode) {
    case "split": return canRenderSplitLayout ? "split" : "unified";
    case "unified": return "unified";
    default:
      return width >= config.diffSplitMinWidth && canRenderSplitLayout
        ? "split" : "unified";
  }
}
```

### Progressive Text Truncation

```typescript
export function buildDiffSummaryText(stats: DiffSummaryStats, width: number): string {
  const candidates = [
    `↳ diff +${stats.added} -${stats.removed} • ${stats.hunks}h • ${stats.files}f`,
    `↳ diff +${stats.added} -${stats.removed}`,
    `+${stats.added} -${stats.removed}`,
    "diff",
    "…",
  ];

  for (const candidate of candidates) {
    if (visibleWidth(candidate) <= width) return candidate;
  }
  return truncateToWidth(candidates[candidates.length - 1] ?? "", width, "");
}
```

### Nerd Font Detection

```typescript
const NERD_FONT_TERMINALS = ["iterm", "wezterm", "kitty", "ghostty", "alacritty"];

export function detectNerdFonts(): boolean {
  if (process.env.GHOSTTY_RESOURCES_DIR) return true;
  if (process.env.PI_NERD_FONTS === "1") return true;
  if (process.env.PI_NERD_FONTS === "0") return false;

  const termProgram = (process.env.TERM_PROGRAM || "").toLowerCase();
  const term = (process.env.TERM || "").toLowerCase();
  return NERD_FONT_TERMINALS.some(t => 
    termProgram.includes(t) || term.includes(t)
  );
}
```

---

## Tool Display Rendering (pi-tool-display)

### Modal Configuration System

```typescript
interface InspectorSettingItem {
  id: string;
  label: string;
  currentValue: string;
  values: readonly string[];
  inspectorTitle: string;
  inspectorSummary: string[];
  inspectorOptions: string[];
  inspectorAdvanced?: string[];
  inspectorPath: string;
  searchTerms: string[];
}

// Example: Tool Output Mode Config
const readOutputConfig: InspectorSettingItem = {
  id: "readOutputMode",
  label: "Read tool output",
  currentValue: config.readOutputMode,
  values: ["hidden", "summary", "preview"],
  inspectorTitle: "Read Tool Output",
  inspectorSummary: [
    "Controls how read results appear inline after the tool call header.",
    "Use hidden for the cleanest transcript, summary for file metrics.",
  ],
  inspectorOptions: [
    "hidden — path and status only",
    "summary — adds compact file metrics",
    "preview — shows the first configured preview lines",
  ],
  inspectorPath: shortenPath(getConfigPath()),
  searchTerms: ["file", "source", "preview"],
};
```

### Preset Detection

```typescript
const TOOL_DISPLAY_PRESETS = ["opencode", "balanced", "verbose", "custom"] as const;

export function detectToolDisplayPreset(config: ToolDisplayConfig): string {
  // Compare config against known presets
  if (matchesOpencodePreset(config)) return "opencode";
  if (matchesBalancedPreset(config)) return "balanced";
  if (matchesVerbosePreset(config)) return "verbose";
  return "custom";
}
```

---

## Feed/Event System (pi-messenger)

### Feed Event Types

```typescript
interface FeedEvent {
  id: string;
  type: "join" | "leave" | "message" | "tool" | "task" | "error" | "system";
  agent: string;
  timestamp: string;
  content: string;
  meta?: Record<string, unknown>;
}

export function logFeedEvent(cwd: string, agent: string, type: FeedEvent["type"], content: string): void {
  const feedPath = path.join(getFeedDir(cwd), "feed.jsonl");
  const event: FeedEvent = {
    id: randomUUID(),
    type,
    agent,
    timestamp: new Date().toISOString(),
    content,
  };
  appendToFile(feedPath, JSON.stringify(event) + "\n");
}

export function readFeedEvents(cwd: string, limit = 50): FeedEvent[] {
  const feedPath = path.join(getFeedDir(cwd), "feed.jsonl");
  const lines = readFileLines(feedPath);
  return lines.slice(-limit).map(line => JSON.parse(line));
}
```

### Event Formatting

```typescript
export function formatFeedLine(event: FeedEvent, theme: Theme): string {
  const time = formatRelativeTime(event.timestamp);
  const agent = coloredAgentName(event.agent);

  switch (event.type) {
    case "join":
      return `${agent} joined ${time}`;
    case "leave":
      return `${agent} left ${time}`;
    case "message":
      return `${agent}: ${truncateToWidth(event.content, 80)}`;
    case "tool":
      return `${agent} ran ${event.content}`;
    case "error":
      return `${agent} error: ${event.content}`;
    default:
      return event.content;
  }
}
```

---

## Crew/Task System (pi-messenger)

### Task Definition

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  assigned_to?: string;
  depends_on?: string[];
  blocked_reason?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  artifacts?: string[];
}
```

### Task Status Rendering

```typescript
const STATUS_ICONS: Record<string, string> = {
  done: "✓",
  in_progress: "●",
  todo: "○",
  blocked: "✗",
};

function renderTaskLine(task: Task, selected: boolean, width: number): string {
  const icon = STATUS_ICONS[task.status] ?? "○";
  const assignee = task.assigned_to 
    ? theme.fg("dim", `@${task.assigned_to}`)
    : "";
  const blocked = task.blocked_reason
    ? theme.fg("error", ` [BLOCKED: ${task.blocked_reason}]`)
    : "";

  const line = `${icon} ${task.title} ${assignee}${blocked}`;
  return selected
    ? theme.bg("accent", theme.fg("background", line))
    : truncateToWidth(line, width);
}
```

### Planning State Display

```typescript
interface PlanningState {
  phase: string;
  pass: number;
  maxPasses: number;
  updatedAt: number;
  stalled: boolean;
}

function renderPlanningState(state: PlanningState, width: number): string {
  const status = state.stalled
    ? theme.fg("error", "STALLED")
    : theme.fg("warning", "Planning");
  
  return truncateToWidth(
    `${status} ${state.pass}/${state.maxPasses} │ ${state.phase} │ ${formatDuration(Date.now() - state.updatedAt)}`,
    width
  );
}
```

---

## Path Utilities

```typescript
export function shortenPath(p: string): string {
  const home = process.env.HOME;
  if (home && p.startsWith(home)) return `~${p.slice(home.length)}`;
  return p;
}

export function truncatePathLeft(filePath: string, maxLen: number): string {
  if (visibleWidth(filePath) <= maxLen) return filePath;
  const parts = filePath.split("/");
  if (parts.length <= 2) return truncateToWidth(filePath, maxLen, "…");
  
  // Keep first and last parts
  const first = parts[0];
  const last = parts[parts.length - 1];
  const middle = "…";
  const available = maxLen - visibleWidth(first + last + middle);
  
  if (available <= 0) return truncateToWidth(last, maxLen, "…");
  return `${first}/${middle}/${truncateToWidth(last, available, "…")}`;
}
```

---

## Rich Tool Call Display

### Tool Call Header

```typescript
function renderToolCall(
  toolName: string,
  args: Record<string, unknown>,
  theme: Theme,
  width: number
): string {
  const argsStr = formatToolArgs(args);
  const header = theme.bg("toolPendingBg", theme.fg("warning", ` ${toolName} `));
  const content = truncateToWidth(argsStr, width - visibleWidth(header) - 2);
  return `${header} ${content}`;
}

function formatToolArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return "";

  const formatted = entries.map(([k, v]) => {
    if (typeof v === "string") return `${k}=${truncateToWidth(v, 50)}`;
    if (typeof v === "number" || typeof v === "boolean") return `${k}=${v}`;
    return `${k}=${JSON.stringify(v).slice(0, 50)}`;
  });

  return formatted.join(" ");
}
```

### Result Truncation with Hint

```typescript
function renderTruncatedResult(
  content: string,
  maxLines: number,
  width: number,
  theme: Theme
): string[] {
  const lines = content.split("\n").slice(0, maxLines);
  const truncated = content.split("\n").length > maxLines;
  const hint = truncated ? theme.fg("dim", ` [+${content.split("\n").length - maxLines} lines]`) : "";

  return [
    ...lines.map(line => truncateToWidth(line, width)),
    hint,
  ];
}
```

---

## Extension Configuration Patterns

### Config File Location

```typescript
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";

export function getExtensionConfigPath(extensionName: string): string {
  return join(getAgentDir(), "extensions", `${extensionName}.json`);
}

export function loadConfig<T>(extensionName: string, defaults: T): T {
  const path = getExtensionConfigPath(extensionName);
  if (!existsSync(path)) return defaults;
  try {
    return { ...defaults, ...JSON.parse(readFileSync(path, "utf-8")) };
  } catch {
    return defaults;
  }
}

export function saveConfig<T>(extensionName: string, config: T): void {
  const path = getExtensionConfigPath(extensionName);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2));
}
```

### Config Preset System

```typescript
interface Preset {
  id: string;
  label: string;
  description: string;
  values: Record<string, unknown>;
}

const PRESETS: Preset[] = [
  {
    id: "minimal",
    label: "Minimal",
    description: "Cleanest possible output",
    values: { previewLines: 4, bashCollapsedLines: 0 },
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Good balance of info and space",
    values: { previewLines: 12, bashCollapsedLines: 10 },
  },
  {
    id: "verbose",
    label: "Verbose",
    description: "Maximum information",
    values: { previewLines: 40, bashCollapsedLines: 40 },
  },
];

export function applyPreset(presetId: string, current: Record<string, unknown>): Record<string, unknown> {
  const preset = PRESETS.find(p => p.id === presetId);
  if (!preset) return current;
  return { ...current, ...preset.values };
}
```

---

## Quick Reference

| Pattern | Extension | Use Case |
|---------|-----------|----------|
| Agent Registration | pi-messenger | Multi-agent mesh |
| Status Computation | pi-messenger | Live agent status |
| File Reservation | pi-messenger | Conflict prevention |
| Activity Log | pi-messenger | Tool call history |
| Diff Mode Adaptive | pi-tool-display | Terminal-aware diffs |
| Progressive Truncation | pi-tool-display | Responsive text |
| Nerd Font Detection | pi-tool-display | Icon compatibility |
| Config Modal | pi-tool-display | Settings UI |
| Feed Event System | pi-messenger | Activity feed |
| Task System | pi-messenger | Crew coordination |
| Path Utilities | All | Path display |
| Config Persistence | All | Settings management |

---

## Reference Repos (All Extensions)

| Extension | Location | Key Patterns |
|----------|----------|-------------|
| pi-interactive-shell | npm | Background widgets, PTY overlay |
| pi-subagents | npm/@tintinweb | Async agent management |
| pi-btw | npm | Transcript rendering |
| pi-generative-ui | git/Michaelliv | SVG/HTML widgets |
| pi-interview | npm | Form with media |
| pi-messenger | npm | Multi-agent mesh, crew, tasks |
| pi-tool-display | npm | Tool output rendering, diffs |
| pi-files | npm | File operations |
| pi-theme-sync | npm/@sherif-fanous | Theme sync |
| pi-extension-settings | npm/@juanibiapina | Extension config UI |
