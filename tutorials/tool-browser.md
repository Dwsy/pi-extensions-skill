# Pi Tool Browser Extension - Tutorial

> Building a searchable, fuzzy-filtered tool list overlay using `pi.getAllTools()`.

## Overview

This extension adds `/tool-list` command that opens an interactive overlay:
- Shows all registered tools via `pi.getAllTools()`
- Fuzzy search by name/description
- Grouped by source (builtin, extension, MCP)
- Keyboard navigation (↑↓, /, Enter, Esc)

## Key APIs Used

```typescript
// Get all registered tools
const tools = pi.getAllTools();
// Returns: ToolInfo[]

interface ToolInfo {
  name: string;
  description: string;
  parameters: TSchema;  // TypeBox schema
  sourceInfo: SourceInfo;  // { type, extension?, provider? }
}

// Open custom overlay
const result = await ctx.ui.custom<ReturnType>(
  (tui, theme, keybindings, done) => new MyComponent(tui, theme, keybindings, done),
  { overlay: true }
);
```

## Component Pattern

```typescript
import { Container, Text, Input, matchesKey } from "@earendil-works/pi-tui";
import type { Focusable, TUI } from "@earendil-works/pi-tui";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

class ToolListComponent extends Container implements Focusable {
  private _focused = false;
  private readonly input: Input;
  
  get focused(): boolean { return this._focused; }
  set focused(value: boolean) {
    this._focused = value;
    this.input.focused = value;  // Delegate to embedded input
  }

  constructor(
    private tui: TUI,
    private theme: ExtensionContext["ui"]["theme"],
    private data: MyData,
    private keybindings: KeybindingsManager,
    private done: () => void,
  ) {
    super();
    this.input = new Input();
    this.input.onSubmit = (value) => this.done();
    this.input.onEscape = () => this.done();
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape")) { this.done(); return; }
    if (matchesKey(data, "up")) { this.moveUp(); return; }
    if (matchesKey(data, "down")) { this.moveDown(); return; }
    // Let embedded input handle text
    this.input.handleInput(data);
    this.tui.requestRender();
  }

  override render(width: number): string[] {
    // Return array of lines to display
    return [...];
  }
}
```

## Fuzzy Search

```typescript
function fuzzyScore(query: string, text: string): number {
  const lq = query.toLowerCase();
  const lt = text.toLowerCase();
  
  // Exact substring match = highest score
  if (lt.includes(lq)) return 100 + (lq.length / lt.length) * 50;
  
  // Character-by-character fuzzy match
  let score = 0, qi = 0, consecutive = 0;
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

function fuzzyFilter<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  const q = query.trim();
  if (!q) return items;
  
  return items
    .map(item => ({ item, score: fuzzyScore(q, getText(item)) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);
}
```

## Box Drawing Helpers

```typescript
function renderHeader(text: string, width: number, theme: Theme): string {
  const innerW = width - 2;
  const padLen = Math.max(0, innerW - text.length);
  const padLeft = Math.floor(padLen / 2);
  return (
    theme.fg("border", "╭" + "─".repeat(padLeft)) +
    theme.fg("accent", text) +
    theme.fg("border", "─".repeat(padLen - padLeft) + "╮")
  );
}

function row(content: string, width: number, theme: Theme): string {
  const innerW = width - 2;
  return theme.fg("border", "│") + content.padEnd(innerW) + theme.fg("border", "│");
}
```

## Tool Source Grouping

```typescript
function getToolSource(tool: ToolInfo): string {
  const info = tool.sourceInfo as { type?: string; extension?: string; provider?: string };
  if (!info) return "builtin";
  if (info.type === "mcp") return "mcp";
  if (info.type === "builtin") return "builtin";
  if (info.extension) return info.extension;
  if (info.provider) return info.provider;
  return "builtin";
}
```

## Input Value Access

**Important:** `Input.value` is private. Use `input.getValue()`:

```typescript
// ❌ Wrong
const text = this.input.value;

// ✅ Correct
const text = this.input.getValue();
```

## Extension Registration

```typescript
export default function (pi: ExtensionAPI) {
  pi.registerCommand("tool-list", {
    description: "Browse all registered tools with fuzzy search",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("Tool list requires TUI", "error");
        return;
      }

      const allTools = pi.getAllTools();
      if (allTools.length === 0) {
        ctx.ui.notify("No tools registered", "info");
        return;
      }

      await ctx.ui.custom<void>(
        (tui, theme, keybindings, done) => 
          new ToolListComponent(tui, theme, allTools, keybindings, done),
        { overlay: true }
      );
    },
  });
}
```

## Testing

```bash
# Load extension temporarily
pi -e ~/.pi/agent/extensions/tool-list.ts

# Type /tool-list to open
/tool-list

# Type / to start search, then filter
/read
```

## Source

`~/.pi/agent/extensions/tool-list.ts`
