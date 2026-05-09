# Beautiful TUI Rendering Guide

> Patterns and helpers for creating visually appealing interactive TUI components in Pi extensions.

This guide covers techniques from:
- [pi-interactive-shell](https://github.com/nicobailon/pi-interactive-shell) - Background widgets, overlay components
- [pi-subagents](https://github.com/nicobailon/pi-subagents) - Live status, formatters
- [pi-btw](https://www.npmjs.com/package/pi-btw) - Transcript rendering, rich TUI overlays
- [pi-generative-ui](https://github.com/Michaelliv/pi-generative-ui) - SVG/HTML widgets

---

## Core Imports

```typescript
import type { Component, Focusable, TUI } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { Box, Container, Input, Text } from "@earendil-works/pi-tui";
```

---

## 1. Box Drawing Helpers

Create bordered panels with headers and footers — the foundation of polished TUI.

### renderHeader / renderFooter

```typescript
export function renderHeader(text: string, width: number, theme: Theme): string {
  const innerW = width - 2;
  const padLen = Math.max(0, innerW - visibleWidth(text));
  const padLeft = Math.floor(padLen / 2);
  const padRight = padLen - padLeft;
  return (
    theme.fg("border", "╭" + "─".repeat(padLeft)) +
    theme.fg("accent", text) +
    theme.fg("border", "─".repeat(padRight) + "╮")
  );
}

export function renderFooter(text: string, width: number, theme: Theme): string {
  const innerW = width - 2;
  const padLen = Math.max(0, innerW - visibleWidth(text));
  const padLeft = Math.floor(padLen / 2);
  const padRight = padLen - padLeft;
  return (
    theme.fg("border", "╰" + "─".repeat(padLeft)) +
    theme.fg("dim", text) +
    theme.fg("border", "─".repeat(padRight) + "╯")
  );
}
```

### Row with Border

```typescript
export function pad(s: string, len: number): string {
  const vis = visibleWidth(s);
  return s + " ".repeat(Math.max(0, len - vis));
}

export function row(content: string, width: number, theme: Theme): string {
  const innerW = width - 2;
  return theme.fg("border", "│") + pad(content, innerW) + theme.fg("border", "│");
}
```

### Complete Box Example

```typescript
function renderBox(lines: string[], width: number, theme: Theme): string[] {
  return [
    renderHeader("Session Status", width, theme),
    ...lines.map((l) => row(l, width, theme)),
    renderFooter("↑↓ Navigate  Enter Select  Esc Close", width, theme),
  ];
}
```

---

## 2. Status Colors

Consistent color coding for states — makes information scannable.

### State Color Map

```typescript
function statusColor(theme: Theme, status: string): string {
  switch (status) {
    case "running": return theme.fg("warning", status);
    case "queued": return theme.fg("accent", status);
    case "complete": return theme.fg("success", status);
    case "failed": return theme.fg("error", status);
    case "pending": return theme.fg("dim", status);
    default: return status;
  }
}
```

### Session Indicator Dots

```typescript
function sessionDot(exited: boolean, monitorActive: boolean, theme: Theme): string {
  if (exited) return theme.fg("dim", "○");
  if (monitorActive) return theme.fg("accent", "◆");
  return theme.fg("accent", "●");
}
```

### Progress Bar

```typescript
function renderProgress(current: number, total: number, width: number, theme: Theme): string {
  const barWidth = width - 8;
  const filled = Math.round((current / total) * barWidth);
  const empty = barWidth - filled;
  const bar = theme.fg("accent", "█".repeat(filled)) + theme.fg("dim", "░".repeat(empty));
  return `[${bar}] ${current}/${total}`;
}
```

---

## 3. Component Architecture

Build reusable interactive components with proper lifecycle.

### Full Component Pattern

```typescript
export class MyListComponent implements Component, Focusable {
  focused = false;
  private cursor = 0;
  private scrollOffset = 0;
  private items: MyItem[] = [];
  private width = 84;
  private viewportHeight = 12;

  constructor(
    private tui: TUI,
    private theme: Theme,
    private done: (result: MyItem | null) => void,
  ) {}

  render(width: number): string[] {
    this.width = width;
    const lines: string[] = [];

    for (let i = 0; i < this.viewportHeight && i < this.items.length; i++) {
      const item = this.items[i + this.scrollOffset];
      const selected = (i + this.scrollOffset) === this.cursor;
      const prefix = selected ? theme.fg("accent", ">") : " ";
      lines.push(`${prefix} ${item.label} ${statusColor(this.theme, item.status)}`);
    }

    return lines;
  }

  handleInput(data: string): void {
    switch (data) {
      case "up":
        this.cursor = Math.max(0, this.cursor - 1);
        this.ensureScrollVisible();
        break;
      case "down":
        this.cursor = Math.min(this.items.length - 1, this.cursor + 1);
        this.ensureScrollVisible();
        break;
      case "return":
        this.done(this.items[this.cursor]);
        break;
      case "escape":
        this.done(null);
        break;
    }
    this.tui.requestRender();
  }

  private ensureScrollVisible(): void {
    if (this.cursor < this.scrollOffset) {
      this.scrollOffset = this.cursor;
    } else if (this.cursor >= this.scrollOffset + this.viewportHeight) {
      this.scrollOffset = this.cursor - this.viewportHeight + 1;
    }
  }
}
```

### Debounced Rendering

```typescript
export class MyComponent implements Component {
  private renderTimeout: ReturnType<typeof setTimeout> | null = null;

  private debouncedRender(): void {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    this.renderTimeout = setTimeout(() => {
      this.renderTimeout = null;
      this.tui.requestRender();
    }, 16); // ~60fps cap
  }

  // Call debouncedRender() from event handlers instead of requestRender() directly
}
```

---

## 4. Background Widget (Persistent Status)

Show persistent status at the bottom of the screen.

### Widget Pattern

```typescript
export function setupStatusWidget(
  ctx: { ui: { setWidget: Function }; hasUI?: boolean },
  sessionManager: MySessionManager,
): (() => void) | null {
  if (!ctx.hasUI) return null;

  let durationTimer: ReturnType<typeof setInterval> | null = null;

  const requestRender = () => ctx.ui.setWidget("my-widget", getRenderFn());
  const unsubscribe = sessionManager.onChange(() => {
    requestRender();
  });

  function getRenderFn() {
    return (tui: any, theme: any) => ({
      render: (width: number) => {
        const sessions = sessionManager.list();
        if (sessions.length === 0) return [];
        return sessions.map((s) => {
          const dot = s.active ? theme.fg("accent", "●") : theme.fg("dim", "○");
          const status = s.active ? theme.fg("success", "running") : theme.fg("dim", "exited");
          return ` ${dot} ${s.id} | ${status} | ${formatDuration(s.duration)}`;
        });
      },
      invalidate: () => {},
    });
  }

  // Auto-refresh duration timer
  const hasRunning = sessionManager.list().some((s) => !s.exited);
  if (hasRunning) {
    durationTimer = setInterval(requestRender, 10_000);
  }

  ctx.ui.setWidget("my-widget", getRenderFn(), { placement: "belowEditor" });

  return () => {
    unsubscribe();
    if (durationTimer) clearInterval(durationTimer);
    ctx.ui.setWidget("my-widget", undefined);
  };
}
```

---

## 5. Overlay with Dialog

Full-screen overlay with selection dialog.

### Dialog Pattern

```typescript
export class MyOverlay implements Component, Focusable {
  focused = false;
  private state: OverlayState = "running";
  private dialogSelection: DialogChoice = "transfer";
  private exitCountdown = 0;

  constructor(
    private tui: TUI,
    private theme: Theme,
    private initialData: MyData,
    private config: MyConfig,
    private done: (result: MyResult) => void,
  ) {
    // Calculate overlay dimensions
    const overlayWidth = Math.floor((tui.terminal.columns * this.config.overlayWidthPercent) / 100);
    const overlayHeight = Math.floor((tui.terminal.rows * this.config.overlayHeightPercent) / 100);
    const cols = Math.max(20, overlayWidth - 4);
    const rows = Math.max(3, overlayHeight - (HEADER_LINES + FOOTER_LINES_COMPACT + 2));
    
    // Resize embedded terminal session
    this.session.resize(cols, rows);
  }

  render(width: number): string[] {
    const lines: string[] = [];
    
    // Header
    lines.push(this.renderHeader("My Overlay", width));
    
    // Content based on state
    if (this.state === "running") {
      lines.push(...this.renderRunningState(width));
    } else {
      lines.push(...this.renderExitedState(width));
    }
    
    // Footer with shortcuts
    lines.push(this.renderFooter(width));
    
    return lines;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "up")) {
      this.moveSelection(-1);
    } else if (matchesKey(data, "down")) {
      this.moveSelection(1);
    } else if (matchesKey(data, "return") || matchesKey(data, "left") || matchesKey(data, "right")) {
      this.selectCurrent();
    } else if (matchesKey(data, "escape")) {
      this.cancel();
    }
    this.tui.requestRender();
  }

  private startExitCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.exitCountdown--;
      if (this.exitCountdown <= 0) {
        this.finishAndClose();
      } else {
        this.tui.requestRender();
      }
    }, 1000);
  }
}
```

---

## 6. Fuzzy Search + Filter

Interactive filtering with fuzzy matching.

```typescript
function fuzzyScore(query: string, text: string): number {
  const lq = query.toLowerCase();
  const lt = text.toLowerCase();
  if (lt.includes(lq)) return 100 + (lq.length / lt.length) * 50;

  let score = 0;
  let qi = 0;
  let consecutive = 0;
  for (let i = 0; i < lt.length && qi < lq.length; i++) {
    if (lt[i] === lq[qi]) {
      score += 10 + consecutive;
      consecutive += 5;
      qi++;
    } else {
      consecutive = 0;
    }
  }
  return qi === lq.length ? score : 0;
}

export function fuzzyFilter<T extends { name: string; description: string }>(
  items: T[],
  query: string
): T[] {
  const q = query.trim();
  if (!q) return items;

  return items
    .map((item) => ({
      item,
      score: Math.max(
        fuzzyScore(q, item.name),
        fuzzyScore(q, item.description) * 0.8
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
```

---

## 7. Scroll Info & Pagination

Handle content larger than viewport.

```typescript
export function formatScrollInfo(above: number, below: number): string {
  let info = "";
  if (above > 0) info += `↑ ${above} more`;
  if (below > 0) info += `${info ? "  " : ""}↓ ${below} more`;
  return info;
}

// Usage in footer
const scrollInfo = formatScrollInfo(scrollOffset, totalItems - scrollOffset - viewportHeight);
lines.push(renderFooter(scrollInfo || "No more items", width, theme));
```

---

## 8. Path Shortening

Make long paths display-friendly.

```typescript
export function shortenPath(p: string): string {
  const home = process.env.HOME;
  if (home && p.startsWith(home)) {
    return `~${p.slice(home.length)}`;
  }
  return p;
}
```

---

## 9. Token/Duration Formatting

Compact display of numbers.

```typescript
export function formatTokens(n: number): string {
  return n < 1000 ? String(n) : n < 10000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n / 1000)}k`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
}

export function formatUsage(u: Usage): string {
  const parts: string[] = [];
  if (u.turns) parts.push(`${u.turns} turn${u.turns > 1 ? "s" : ""}`);
  if (u.input) parts.push(`in:${formatTokens(u.input)}`);
  if (u.output) parts.push(`out:${formatTokens(u.output)}`);
  if (u.cost) parts.push(`$${u.cost.toFixed(4)}`);
  return parts.join(" ");
}
```

---

## 10. Auto-Refresh Component

Live updating data with configurable refresh interval.

```typescript
const AUTO_REFRESH_MS = 2000;

export class LiveStatusComponent implements Component {
  private readonly refreshTimer: NodeJS.Timeout;
  private active: RunSummary[] = [];
  private recent: RunSummary[] = [];

  constructor(
    private tui: TUI,
    private theme: Theme,
    private done: () => void,
    private deps: { refreshMs?: number; listRuns?: () => RunData } = {},
  ) {
    this.reload();
    const refreshMs = deps.refreshMs ?? AUTO_REFRESH_MS;
    this.refreshTimer = setInterval(() => {
      this.reload();
      this.tui.requestRender();
    }, refreshMs);
    this.refreshTimer.unref?.(); // Don't block process exit
  }

  private reload(): void {
    try {
      const data = this.deps.listRuns?.() ?? fetchRuns();
      this.active = data.active;
      this.recent = data.recent;
      this.errorMessage = undefined;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : "Unknown error";
    }
  }

  render(width: number): string[] {
    if (this.errorMessage) {
      return [
        renderHeader("Error", width, this.theme),
        row(this.errorMessage, width, this.theme),
        renderFooter("Press any key to close", width, this.theme),
      ];
    }
    // ... render active/recent items
    return lines;
  }

  handleInput(data: string): void {
    this.done();
  }

  destroy(): void {
    clearInterval(this.refreshTimer);
  }
}
```

---

## 11. Transcript Rendering (pi-btw Pattern)

Rich conversation transcript with badges, tool calls, and streaming indicators.

### Transcript Entry Types

```typescript
type TranscriptEntry =
  | { id: number; turnId: number; type: "turn-boundary"; phase: "start" | "end" }
  | { id: number; turnId: number; type: "user-message"; text: string }
  | { id: number; turnId: number; type: "thinking"; text: string; streaming: boolean }
  | { id: number; turnId: number; type: "assistant-text"; text: string; streaming: boolean }
  | { id: number; turnId: number; type: "tool-call"; toolCallId: string; toolName: string; args: string }
  | { id: number; turnId: number; type: "tool-result"; toolCallId: string; toolName: string; content: string; truncated: boolean; isError: boolean; streaming: boolean };
```

### Transcript Renderer

```typescript
function renderTranscript(
  entries: TranscriptEntry[],
  theme: Theme,
  options: { maxWidth?: number; truncateResults?: number } = {}
): string[] {
  const { maxWidth = 120, truncateResults = 500 } = options;
  const lines: string[] = [];
  const separator = theme.fg("borderMuted", "─".repeat(maxWidth));
  const blockIndent = "  ";
  const resultIndent = "    ";

  // Badges
  const userBadge = theme.bg("userMessageBg", theme.fg("accent", theme.bold(" USER ")));
  const assistantBadge = theme.bg("customMessageBg", theme.fg("warning", theme.bold(" ASST ")));
  const thinkingBadge = theme.bg("toolPendingBg", theme.fg("warning", theme.bold(" THNK ")));
  const toolBadge = theme.bg("toolPendingBg", theme.fg("warning", theme.bold(" TOOL ")));

  const pushInlineBlock = (header: string, text: string, style?: (v: string) => string) => {
    const styled = style ?? ((v: string) => v);
    const firstLine = text.split("\n")[0];
    lines.push(`${header} ${styled(firstLine)}`);
    for (const line of text.split("\n").slice(1)) {
      lines.push(`${blockIndent}${styled(line)}`);
    }
  };

  for (const entry of entries) {
    if (entry.type === "turn-boundary" && entry.phase === "start" && lines.length > 0) {
      lines.push(separator);
      continue;
    }

    if (entry.type === "user-message") {
      pushInlineBlock(userBadge, entry.text);
    } else if (entry.type === "thinking") {
      const header = entry.streaming ? `${thinkingBadge} ${theme.fg("warning", "▍")}` : thinkingBadge;
      lines.push(header);
      for (const line of entry.text.split("\n")) {
        lines.push(`${blockIndent}${theme.fg("warning", theme.italic(line))}`);
      }
    } else if (entry.type === "tool-call") {
      const toolLabel = theme.fg("warning", theme.bold(entry.toolName));
      const argsLabel = entry.args ? theme.fg("dim", ` · ${entry.args}`) : "";
      lines.push(`${toolBadge} ${toolLabel}${argsLabel}`);
    } else if (entry.type === "tool-result") {
      const resultHeader = entry.isError
        ? theme.fg("error", "↳ error")
        : entry.streaming
          ? theme.fg("warning", "↳ streaming result")
          : theme.fg("dim", "↳ result");
      const truncated = entry.truncated ? theme.fg("dim", " (truncated)") : "";
      const content = entry.truncated ? entry.content.slice(0, truncateResults) + "..." : entry.content;
      lines.push(`${resultHeader}${truncated}`);
      for (const line of content.split("\n")) {
        lines.push(`${resultIndent}${entry.isError ? theme.fg("error", line) : theme.fg("dim", line)}`);
      }
    } else if (entry.type === "assistant-text") {
      const header = entry.streaming ? `${assistantBadge} ${theme.fg("warning", "▍")}` : assistantBadge;
      lines.push(header);
      for (const line of entry.text.split("\n")) {
        lines.push(`${blockIndent}${line}`);
      }
    }
  }

  return lines;
}
```

### Transcript Container with Input (pi-btw Overlay Pattern)

```typescript
class TranscriptOverlay extends Container implements Focusable {
  private readonly input: Input;
  private readonly statusText: Text;
  private readonly transcript: Container;
  private transcriptScrollOffset = 0;
  private followTranscript = true;

  get focused(): boolean { return this._focused; }
  set focused(value: boolean) {
    this._focused = value;
    this.input.focused = value;
  }

  constructor(
    private tui: TUI,
    private theme: Theme,
    private keybindings: KeybindingsManager,
    private onSubmit: (value: string) => void,
    private onDismiss: () => void,
  ) {
    super();
    this.input = new Input();
    this.input.onSubmit = (value) => {
      this.followTranscript = true;
      this.onSubmit(value);
    };
    this.input.onEscape = () => this.onDismiss();
  }

  private wrapTranscript(lines: string[], innerWidth: number): string[] {
    const wrapped: string[] = [];
    for (const line of lines) {
      if (!line) { wrapped.push(""); continue; }
      wrapped.push(...wrapTextWithAnsi(line, Math.max(1, innerWidth)));
    }
    return wrapped;
  }

  handleInput(data: string): void {
    if (matchesKey(data, Key.pageUp)) {
      this.followTranscript = false;
      this.transcriptScrollOffset = Math.max(0, this.transcriptScrollOffset - 10);
      this.tui.requestRender();
      return;
    }
    if (matchesKey(data, Key.pageDown)) {
      this.transcriptScrollOffset += 10;
      this.tui.requestRender();
      return;
    }
    this.input.handleInput(data);
  }

  override render(width: number): string[] {
    const dialogHeight = Math.max(18, Math.min(32, Math.floor((process.stdout.rows ?? 30) * 0.78)));
    // ... render header, transcript, input, footer
    return lines;
  }
}
```

---

## 12. Border Helpers (pi-btw Pattern)

Frame lines with precise border characters.

```typescript
private frameLine(content: string, innerWidth: number): string {
  const truncated = truncateToWidth(content, innerWidth, "");
  const padding = Math.max(0, innerWidth - visibleWidth(truncated));
  return `${this.theme.fg("borderMuted", "│")}${truncated}${" ".repeat(padding)}${this.theme.fg("borderMuted", "│")}`;
}

private ruleLine(innerWidth: number): string {
  return this.theme.fg("borderMuted", `├${"─".repeat(innerWidth)}┤`);
}

private borderLine(innerWidth: number, edge: "top" | "bottom"): string {
  const left = edge === "top" ? "┌" : "└";
  const right = edge === "top" ? "┐" : "┘";
  return this.theme.fg("borderMuted", `${left}${"─".repeat(innerWidth)}${right}`);
}
```

---

## 13. Input Embedding in Overlay (Stable Width Pattern)

Avoid cursor marker skewing border width.

```typescript
private inputFrameLine(dialogWidth: number): string {
  const targetWidth = Math.max(1, dialogWidth - 2);
  // Render input unfocused to avoid cursor marker shifting the border
  const previousFocused = this.input.focused;
  this.input.focused = false;
  try {
    const inputLine = this.input.render(targetWidth)[0] ?? "";
    return `${this.theme.fg("borderMuted", "│")}${inputLine}${this.theme.fg("borderMuted", "│")}`;
  } finally {
    this.input.focused = previousFocused;
  }
}
```

---

## 14. Glimpse HTML Widget (pi-generative-ui Pattern)

Rich HTML/SVG widgets using the Glimpse system.

### Glimpse Integration

```typescript
async function openGlimpseWidget(open: Function, html: string, title: string): Promise<GlimpseWindow> {
  return open(html, {
    width: 800,
    height: 600,
    title,
  });
}
```

### Core CSS Variables (from guidelines.ts)

```css
:root {
  /* Backgrounds */
  --color-background-primary: #ffffff;
  --color-background-secondary: #f5f5f5;
  --color-background-tertiary: #e8e8e8;
  --color-background-info: #e3f2fd;
  --color-background-danger: #ffebee;
  --color-background-success: #e8f5e9;
  --color-background-warning: #fff8e1;
  
  /* Text */
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  
  /* Borders */
  --color-border-tertiary: rgba(0,0,0,0.15);
  --color-border-secondary: rgba(0,0,0,0.3);
  --color-border-primary: rgba(0,0,0,0.4);
  
  /* Layout */
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --border-radius-xl: 16px;
  
  /* Fonts */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: ui-monospace, monospace;
}
```

### SVG Color Classes (Auto Dark Mode)

```css
/* Purple: 800 fill, 200 stroke, 100 text */
svg .c-purple > rect, svg .c-purple > circle { fill: #3C3489; stroke: #AFA9EC; }
svg .c-purple > .th, svg .c-purple > .t { fill: #CECBF6; }
svg .c-purple > .ts { fill: #AFA9EC; }

/* Teal */
svg .c-teal > rect, svg .c-teal > circle { fill: #085041; stroke: #5DCAA5; }
svg .c-teal > .th, svg .c-teal > .t { fill: #9FE1CB; }
svg .c-teal > .ts { fill: #5DCAA5; }

/* Blue */
svg .c-blue > rect, svg .c-blue > circle { fill: #0C447C; stroke: #85B7EB; }
svg .c-blue > .th, svg .c-blue > .t { fill: #B5D4F4; }
svg .c-blue > .ts { fill: #85B7EB; }

/* Green */
svg .c-green > rect, svg .c-green > circle { fill: #27500A; stroke: #97C459; }
svg .c-green > .th, svg .c-green > .t { fill: #C0DD97; }
svg .c-green > .ts { fill: #97C459; }

/* Amber */
svg .c-amber > rect, svg .c-amber > circle { fill: #633806; stroke: #EF9F27; }
svg .c-amber > .th, svg .c-amber > .t { fill: #FAC775; }
svg .c-amber > .ts { fill: #EF9F27; }

/* Red */
svg .c-red > rect, svg .c-red > circle { fill: #791F1F; stroke: #F09595; }
svg .c-red > .th, svg .c-red > .t { fill: #F7C1C1; }
svg .c-red > .ts { fill: #F09595; }
```

### Chart.js Example

```html
<div style="position: relative; width: 100%; height: 300px;">
  <canvas id="myChart"></canvas>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js" onload="initChart()"></script>
<script>
function initChart() {
  new Chart(document.getElementById('myChart'), {
    type: 'bar',
    data: {
      labels: ['Q1','Q2','Q3','Q4'],
      datasets: [{ label: 'Revenue', data: [12,19,8,15] }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--color-text-primary') } } },
      scales: {
        x: { ticks: { color: 'var(--color-text-secondary)' }, grid: { color: 'var(--color-border-tertiary)' } },
        y: { ticks: { color: 'var(--color-text-secondary)' }, grid: { color: 'var(--color-border-tertiary)' } }
      }
    }
  });
}
</script>
```

### Mermaid Diagram

```html
<div id="diagram" style="width:100%;overflow-x:auto;"></div>
<script type="module">
import mermaid from 'https://esm.sh/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: true, theme: 'base', themeVariables: { primaryColor: '#0C447C', primaryTextColor: '#B5D4F4' }});
document.getElementById('diagram').innerHTML = '<pre class="mermaid">graph LR\nA[Input] --> B[Process]</pre>';
</script>
```

---

## 15. Badge Helpers

Create styled badges with background colors.

```typescript
function buildBadge(
  theme: Theme,
  label: string,
  background: "userMessageBg" | "toolPendingBg" | "customMessageBg",
  foreground: "accent" | "warning" | "success",
): string {
  return theme.bg(background, theme.fg(foreground, theme.bold(` ${label} `)));
}

// Usage
const userBadge = buildBadge(theme, "USER", "userMessageBg", "accent");
const toolBadge = buildBadge(theme, "TOOL", "toolPendingBg", "warning");
const doneBadge = buildBadge(theme, "DONE", "customMessageBg", "success");
```

---

## Quick Reference

| Pattern | Use Case | Key APIs |
|---------|----------|----------|
| Box drawing | Bordered panels | `renderHeader`, `renderFooter`, `row` |
| Status colors | State indicators | `statusColor()`, dot indicators |
| Progress bar | Progress display | Unicode block chars |
| Component | Reusable UI | `Component` + `Focusable` |
| Widget | Persistent status | `ctx.ui.setWidget()` |
| Overlay | Modal dialogs | `ctx.ui.custom()` |
| Fuzzy filter | Search/filter | `fuzzyScore()`, `fuzzyFilter()` |
| Auto-refresh | Live data | `setInterval` + `unref()` |
| Debounce | Performance | `clearTimeout` + `setTimeout` |
| Pagination | Large lists | `scrollOffset` + viewport math |
| Transcript | Rich conversation | Badge system, tool call rendering |
| Border helpers | Frame lines | Unicode box drawing |
| Glimpse widget | HTML/SVG | `glimpseui` + CSS variables |
| SVG classes | Dark mode colors | `c-purple`, `c-blue`, etc. |

---

## Reference Repos

| Extension | URL | Key Files |
|----------|-----|-----------|
| pi-interactive-shell | https://github.com/nicobailon/pi-interactive-shell | `background-widget.ts`, `reattach-overlay.ts`, `render-helpers.ts` |
| pi-subagents | https://github.com/nicobailon/pi-subagents | `subagents-status.ts`, `render-helpers.ts`, `formatters.ts` |
| pi-btw | https://www.npmjs.com/package/pi-btw | `btw.ts` - transcript rendering, overlay components |
| pi-generative-ui | https://github.com/Michaelliv/pi-generative-ui | `guidelines.ts`, `svg-styles.ts` - HTML/SVG widgets |
| pi-interview | npm:pi-interview | `schema.ts`, `server.ts` - interview form with media support |
