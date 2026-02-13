# RPC Mode Compatibility

Guide for making extensions work correctly in RPC mode (`pi --mode rpc`).

---

## The Trap: `ctx.hasUI` Is True in RPC

| Mode | `ctx.hasUI` | `custom()` | Dialogs | Fire-and-forget | TUI-only |
|------|-------------|------------|---------|-----------------|----------|
| Interactive | `true` | ✅ Component | ✅ TUI | ✅ TUI | ✅ |
| RPC | `true` | ❌ `undefined` | ✅ JSON protocol | ✅ JSON events | ❌ no-op |
| Print (`-p`) | `false` | ❌ | ❌ | ❌ | ❌ |
| JSON | `false` | ❌ | ❌ | ❌ | ❌ |

The critical insight: `ctx.hasUI` is `true` in RPC mode because dialog methods (`select`, `confirm`, `input`, `editor`) and fire-and-forget methods (`notify`, `setStatus`, `setWidget`, `setTitle`, `setEditorText`) work via the extension UI sub-protocol. But `custom()` returns `undefined` because it requires direct TUI access.

---

## What Works in RPC

**Dialog methods** (block until client responds):
- `ctx.ui.select()` — emits `extension_ui_request`, waits for `extension_ui_response`
- `ctx.ui.confirm()` — same, supports `timeout` option
- `ctx.ui.input()` — same
- `ctx.ui.editor()` — same

**Fire-and-forget methods** (emit event, no response):
- `ctx.ui.notify()` — client displays or ignores
- `ctx.ui.setStatus()` — status bar update
- `ctx.ui.setWidget()` — string arrays only (component factories ignored)
- `ctx.ui.setTitle()` — terminal title
- `ctx.ui.setEditorText()` — prefill editor

---

## What Breaks in RPC

| Method | RPC Behavior | Risk |
|--------|-------------|------|
| `custom()` | Returns `undefined` | **High** — logic depends on return value |
| `setWorkingMessage()` | No-op | Low — cosmetic only |
| `setFooter()` | No-op | Low — cosmetic only |
| `setHeader()` | No-op | Low — cosmetic only |
| `setEditorComponent()` | No-op | Low — editor replacement |
| `setToolsExpanded()` | No-op | Low — UI toggle |
| `getEditorText()` | Returns `""` | Medium — if logic depends on editor content |
| `getToolsExpanded()` | Returns `false` | Low |
| `getAllThemes()` | Returns `[]` | Low |
| `getTheme()` | Returns `undefined` | Low |
| `setTheme()` | Returns `{ success: false }` | Low |
| `pasteToEditor()` | Delegates to `setEditorText()` | Low — no paste handling |

---

## Strategy 1: Disable in RPC (Simplest)

For extensions that are purely TUI-interactive (games, custom overlays, visual tools):

```typescript
export default function (pi: ExtensionAPI) {
  // Skip entirely in RPC mode
  if (process.argv.includes("--mode") && process.argv.includes("rpc")) return;

  // ... extension code
}
```

Use when:
- Extension relies heavily on `custom()` for its core functionality
- No meaningful RPC fallback exists
- Extension is cosmetic/entertainment (games, visual effects)

---

## Strategy 2: Graceful Degradation (Recommended)

For extensions that should work in both modes:

```typescript
export default function (pi: ExtensionAPI) {
  const isRPC = process.argv.includes("--mode") && process.argv.includes("rpc");

  pi.registerCommand("my-cmd", {
    handler: async (_args, ctx) => {
      if (isRPC) {
        // Fallback: use dialog methods instead of custom()
        const choice = await ctx.ui.select("Pick one:", ["A", "B", "C"]);
        if (!choice) return;
        // ... proceed with choice
      } else {
        // Full TUI experience
        const result = await ctx.ui.custom<string>((tui, theme, _kb, done) => {
          // ... rich component
        });
        if (!result) return;
        // ... proceed with result
      }
    },
  });
}
```

---

## Strategy 3: sendMessage Fallback (For Output)

When you need to show complex content that `custom()` would normally render:

```typescript
function showResult(ctx: ExtensionContext, data: any) {
  const isRPC = process.argv.includes("--mode") && process.argv.includes("rpc");

  if (isRPC) {
    // Send as message — RPC client can render however it wants
    pi.sendMessage({
      customType: "my-extension-result",
      content: formatAsMarkdown(data),
      display: true,
      details: data,
    }, { triggerTurn: false });
  } else {
    // Rich TUI display
    ctx.ui.custom((tui, theme, _kb, done) => {
      // ... interactive component
    });
  }
}
```

---

## Pattern: Safe Notify

The role-persona pattern for notifications that work everywhere:

```typescript
function notify(ctx: ExtensionContext, message: string, level?: string): void {
  if (ctx.hasUI) {
    ctx.ui.notify(message, (level as any) ?? "info");
  } else {
    // Print/JSON mode fallback
    pi.sendMessage({
      customType: "my-notify",
      content: message,
      display: true,
    }, { triggerTurn: false });
  }
}
```

---

## Pattern: Safe Permission Gate

The `!ctx.hasUI` guard is NOT enough for safety-critical code in RPC:

```typescript
// ❌ WRONG — RPC has hasUI=true but custom() returns undefined
pi.on("tool_call", async (event, ctx) => {
  if (isDangerous(event)) {
    if (!ctx.hasUI) {
      return { block: true, reason: "No UI" };
    }
    // custom() returns undefined in RPC → command runs unblocked!
    const result = await ctx.ui.custom<boolean>((tui, theme, _kb, done) => {
      // ... confirmation dialog
    });
    if (!result) return { block: true, reason: "Blocked" };
  }
});

// ✅ CORRECT — use select/confirm which work in RPC
pi.on("tool_call", async (event, ctx) => {
  if (isDangerous(event)) {
    if (!ctx.hasUI) {
      return { block: true, reason: "No UI" };
    }
    const choice = await ctx.ui.select(
      `⚠️ Dangerous: ${event.input.command}`,
      ["Allow", "Block"],
      { timeout: 30000 }
    );
    if (choice !== "Allow") {
      return { block: true, reason: "Blocked by user" };
    }
  }
});
```

---

## Timed Dialogs

Dialogs support `timeout` for auto-dismissal (works in both TUI and RPC):

```typescript
// Auto-cancels after 5 seconds with countdown
const confirmed = await ctx.ui.confirm(
  "Allow?",
  "Auto-blocks in 5 seconds",
  { timeout: 5000 }
);

// select with timeout
const choice = await ctx.ui.select(
  "Pick one:",
  ["A", "B"],
  { timeout: 10000 }
);

// Returns: undefined (select/input) or false (confirm) on timeout
```

For manual control, use `AbortSignal`:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

const confirmed = await ctx.ui.confirm(
  "Allow?",
  "Message",
  { signal: controller.signal }
);

if (controller.signal.aborted) {
  // Timed out (vs user cancelled)
}
```

---

## RPC Extension UI Protocol Summary

**Dialog methods** emit `extension_ui_request` and block for `extension_ui_response`:

```json
// Request (stdout)
{ "type": "extension_ui_request", "id": "uuid-1", "method": "select", "title": "Pick", "options": ["A", "B"] }

// Response (stdin)
{ "type": "extension_ui_response", "id": "uuid-1", "value": "A" }

// Cancel
{ "type": "extension_ui_response", "id": "uuid-1", "cancelled": true }
```

**Fire-and-forget methods** emit `extension_ui_request` with no response expected:

```json
{ "type": "extension_ui_request", "id": "uuid-2", "method": "notify", "message": "Done", "notifyType": "info" }
{ "type": "extension_ui_request", "id": "uuid-3", "method": "setStatus", "statusKey": "my-ext", "statusText": "Running..." }
```

---

## Decision Matrix

| Extension Type | Strategy | Example |
|---------------|----------|---------|
| Games / visual toys | Disable | `games/`, `snake.ts` |
| Safety gates using `custom()` | Rewrite to use `select`/`confirm` | `permission-gate.ts` |
| Interactive wizards | Degrade to dialog chain | `output-styles.ts` |
| Status/widget displays | No change needed | `token-rate.ts` |
| Notification-only | No change needed | `tool-timestamp.ts` |
| Memory/state systems | Usually fine (file I/O) | `role-persona` |
| Overlay components | Disable or degrade | `pi-interactive-shell` |

---

*Reference: [rpc.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/rpc.md) · [API Reference](../references/api.md)*
