# TUI Mouse Interaction & Theming Contracts

> Verified against pi-tui 1.5.0 (`dist/tui.d.ts`, `dist/tui.js`, `dist/tui-alt-screen.js`, `dist/components/select-list.js`) and a real refactor of `extensions/pi-mesh` (wheel → click → hover → theme).
> Read this **before** adding wheel / click / hover to a self-drawn `ctx.ui.custom` component, or when a themed overlay looks wrong.

---

## 1. Decide first

| Situation | What to do |
|---|---|
| Built-in `SelectList`, `SettingsList`, `Input`, `Editor` | Nothing — they already handle wheel and press/click. Only **forward** `handleMouse` if you wrap them. |
| Plain-text overlay (no selectable rows) | Wheel only; click has no affordance, return `undefined`. |
| Self-drawn list / menu | `rowMap` + two-phase press/click (§4). Optional hover (§5). |
| Wrapper rendering extra rows around a child | Translate coordinates before delegating (§6). |
| Regular (non-fullscreen) TUI mode | **No mouse events at all.** `TuiMainScreen` leaves the mouse to the terminal, so a keyboard path is mandatory. |
| tmux / zellij / screen | Only `1000+1002` mouse tracking is enabled (no `1003`), so `type: "move"` never arrives. Hover silently degrades; never promise it in copy. |

---

## 2. Event & result contracts

```typescript
import type { TuiMouseEvent, TuiMouseEventResult } from "@earendil-works/pi-tui";

type TuiMouseEventType = "press" | "release" | "move" | "drag" | "click" | "wheel";
type TuiMouseButton   = "left" | "middle" | "right" | "none";

interface TuiMouseEvent {
  type; button;
  x, y;                 // component-local, zero-based
  screenX, screenY;     // absolute terminal coordinates
  width, height;        // current component bounds
  shift, alt, ctrl;
  wheelDelta?;          // logical lines, negative = up
  clickCount?;          // on "click" only
}

interface TuiMouseEventResult {
  handled?: boolean;    // stop propagation + suppress renderer fallback
  capture?: boolean;    // route subsequent drag/release here (implies handled)
  focus?: boolean;      // request keyboard focus (implies handled)
  render?: boolean;     // see default table below
}
```

**`render` defaults** (`applyMouseDispatchResult` in `tui-alt-screen.js`):

| Event | Default `render` |
|---|---|
| `press`, `click`, `drag`, `wheel` | `true` |
| `move`, `release` | `false` |
| any event where `focus` changed the focused component | `true` |

Returning `undefined` hands the event to renderer fallbacks: unhandled wheel scrolls the nearest `ScrollView` (and chains unused delta), unhandled primary drags select text, OSC 8 links win over enclosing click regions.

---

## 3. Dispatch chain — the non-obvious parts

1. `dispatchMouseEvent(component, event)` **discards** any result without `handled || capture || focus`:
   ```js
   if (!result.handled && !result.capture && !result.focus) return undefined;
   ```
   A hover handler that returns only `{ render: true }` is silently dropped.
2. A `press` must return a handled result. Only then does `TuiAltScreen` record `mousePressTarget`; the subsequent `click` (emitted on release at the **same coordinates**, only if no drag happened) is routed back to that target.
3. Therefore the standard two-phase contract: `press` selects + `{ handled: true, focus: true }`; `click` selects + runs the row's Enter action + `{ handled: true }`. This mirrors `SelectList.handleMouse` and `SettingsList.handleMouse` — reuse it, do not invent a "single click selects, double click confirms" scheme.
4. `Component.handleMouse` is optional; `ctx.ui.custom` wrappers that only forward `handleInput` will never see mouse events.
5. `Container.handleMouse` already dispatches to children using geometry recorded by `Container.render` (`mouseLayout`). Prefer delegating to the Container over manually computing each child's height.

---

## 4. Pattern: wheel + press + click with `rowMap`

Record a row→item map during `render()` so hit-testing automatically follows headers, group rows, scrolling windows and cached renders. `-1` means "not selectable".

```typescript
private rowMap: number[] = [];
private pressedIndex: number | undefined;

render(width: number): string[] {
  this.rowMap = [];
  const lines: string[] = [];
  const push = (line: string, itemIndex = -1) => {
    lines.push(truncateToWidth(line, width));
    this.rowMap.push(itemIndex);   // MUST stay 1:1 with returned lines
  };
  push(header);                       // -1
  for (const visible of visibleItems) push(draw(visible), visible.absoluteIndex);
  push(footer);                       // -1
  return lines;                       // cached early-return keeps the last rowMap
}

handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
  if (event.type === "wheel" && event.wheelDelta) {
    this.offset = clamp(this.offset + event.wheelDelta);
    return { handled: true };
  }
  if (event.button !== "left" || (event.type !== "press" && event.type !== "click")) return undefined;

  const index = this.rowMap[event.y];
  if (index === undefined || index < 0) return undefined;   // header / blank / detail pane

  if (event.type === "press") {
    this.pressedIndex = index;
    this.select(index);
    return { handled: true, focus: true };
  }
  const target = this.pressedIndex ?? index;
  this.pressedIndex = undefined;
  this.select(target);
  this.activate(target);             // reuse the keyboard Enter path
  return { handled: true };
}
```

Notes that matter in practice:

- `wheelDelta` may be > 1 (acceleration, Alt+wheel ×5). Apply it directly, clamp both ends.
- `rowMap` values are **absolute item indices**, not visible-row numbers, otherwise scrolled lists select the wrong item.
- Reusing the Enter path (`handleInput("\r")` works: `matchesKey("\r", Key.enter)` is `true`) avoids duplicating side effects such as `done()` / `close()`.
- For split-pane components, record the divider column during `render()` (`splitX = leftWidth + borderColumns`) and ignore clicks where `event.x >= splitX`.
- If `render()` caches lines, do **not** clear `rowMap` in `refresh()`; rebuild it only when the cache is rebuilt.

---

## 5. Pattern: hover

```typescript
if (event.type === "move" && event.button === "none") {
  const row = this.rowMap[event.y];
  const next = row === undefined || row < 0 ? undefined : row;
  if (next === this.hoveredIndex) return { handled: true, render: false };
  this.hoveredIndex = next;
  return { handled: true, render: true };   // move defaults to render:false
}
```

- `handled: true` is mandatory (§3.1); `render: true` is mandatory because `move` defaults to no repaint.
- Hover **must not** change `selectedIndex` / `cursor` / `scrollOffset` — built-in `SelectList` comments this explicitly.
- Keep the hover affordance visually distinct from selection (e.g. `accent` colouring on a non-selected row vs a `❯` cursor + bold on the selected row), and keep the row's display width unchanged. Prefer ASCII markers over ambiguous-width glyphs such as `·`.
- Clear hover when the pointer lands on a non-selectable row or in a detail pane; leave `drag` / button-held motion / right-click to the existing guards (return `undefined`).

---

## 6. Wrapper coordinate translation (most common bug)

`event.y` is relative to the **whole component output**. If a wrapper prepends headers/borders before a child's lines, forwarding the raw event makes built-in lists hit the wrong row.

```typescript
let headerRows = 0;

return {
  render(w) {
    const borderLines = container.render(w);
    headerRows = borderLines.length;
    return [...borderLines, ...usage.render(w), "", bottomBorder];
  },
  handleMouse: (event) => usage.handleMouse({
    ...event,
    x: event.x - 1,                 // left border column
    y: event.y - headerRows,
  }),
};
```

Prefer delegating to `Container.handleMouse({...event, x, y, width: childRenderWidth})` so its recorded `mouseLayout` resolves nested `Box → SettingsList` geometry. Pass the child's render width, otherwise `Container` falls back to re-rendering children at the outer width and heights can drift.

Symptoms of a missing translation: clicks select a row several lines away, or nothing at all.

---

## 7. `Container` inheritance trap (TS2416)

`Container.handleMouse` returns `TuiMouseDispatchResult | undefined` (it carries a `target`). `Component.handleMouse` returns `TuiMouseEventResult | undefined`. Declaring the latter on a `class X extends Container` fails:

```
TS2416: Property 'handleMouse' in type 'X' is not assignable to the same property in base type 'Container'.
```

If the class never calls `addChild` and fully overrides `render`, drop the inheritance (`implements Component, Focusable`), add `invalidate(): void {}`, and declare the mouse handler freely. Do not cast the return value.

---

## 8. Theming: never hard-code SGR

`ctx.ui.custom((tui, theme, kb, done) => ...)` hands you the active theme — do not name the parameter `_theme`. Hard-coded sequences like `\x1b[32m` break dark/light themes and drift from the rest of Pi's UI.

- Use semantic names: `theme.fg("accent" | "dim" | "border" | "text" | "muted" | "success" | "warning" | "error", text)` and `theme.bold(text)`.
- pi-tui appends an SGR reset and OSC 8 reset at the end of **every** line, so per-line `C.reset` is redundant.
- Use `visibleWidth()`, `truncateToWidth(line, width, "…", true)`, `sliceByColumn()`, `wrapTextWithAnsi()` rather than a hand-rolled width table.
- If a legacy component concatenates style *prefixes* (`${C.dim}text${C.reset}`) and a full rewrite is too risky, derive the prefixes once from the theme (call `theme.fg(color, MARKER)` and slice around the marker), re-derive in `invalidate()`, and add a test injecting two different themes. Keep this adapter small and commented — it is a migration aid, not a pattern to copy.
- **ANSI-aware truncation**: if you must keep a custom `fit()`, walk the string, copy SGR sequences verbatim, count only visible cells, close any still-open style before emitting `…`. The old "strip all escapes on truncation" trick makes long rows visibly lose their colour.

---

## 9. Module resolution in standalone extensions

An extension directory with its own `package.json` / `node_modules` may **not** resolve `@earendil-works/pi-tui` when its unit tests run, even though Pi resolves it at runtime. A top-level **value** import (`import { Key, matchesKey } from "@earendil-works/pi-tui"`) then breaks every test that imports the module — including import smoke tests.

Practical options, in order:

1. Keep the pure rendering/core module free of pi-tui value imports; inject theme, key matchers and width helpers through a deps object (`MeshPanelDeps` in `extensions/pi-mesh`). Tests supply plain mocks.
2. In the **command entry** (which tests usually only read as text), load lazily inside the async handler:
   ```typescript
   const { Key, matchesKey } = await import("@earendil-works/pi-tui");
   ```
   Runtime sees the package; a test that merely imports the module never executes the handler.
3. `import type { TuiMouseEvent, ... }` is always safe — it is erased at runtime.

Symptom: `Cannot find module '@earendil-works/pi-tui' from '.../src/command.ts'` in an otherwise passing suite.

---

## 10. Copy contract for overlays

- Footer: keep only the 3 highest-frequency actions (e.g. `↑↓ 选择 · Enter 详情 · ? 快捷键`). `?` opens a grouped shortcut reference. Do not maintain 4 width-dependent fallback strings — one string plus `truncateToWidth` is enough.
- Help layer: group by intent (navigation / filter & search / actions / other) instead of one flat key table duplicated from the footer.
- Keep text that carries information no layout can: current input, destructive-action confirmations, units, empty-state reasons. Delete slogans and helper text that explains an obvious affordance.
- Never advertise hover in the footer: it does not fire under terminal multiplexers.

---

## 11. Verification checklist

- [ ] Existing tests pass before and after; add real-instance tests for press/click/hover, not just source-string assertions.
- [ ] Assert `handleMouse` returns `undefined` for right/middle button, `move` with a held button, `drag`, non-selectable rows, and the detail pane.
- [ ] Assert hover does not move the selection (e.g. the `❯` line index is unchanged) and repeated `move` on the same row returns `render: false`.
- [ ] Inject two different mock themes and assert the rendered output contains the injected codes and no legacy hard-coded colour SGR.
- [ ] Assert truncated lines still contain their ANSI style and stay within the viewport width (CJK included).
- [ ] Compare `tsc --noEmit` output against a **normalised baseline** (strip line numbers) — a large repo may have many pre-existing errors; only new error messages matter. Attribute unrelated new errors to parallel edits before claiming regressions.
- [ ] Keep a contract test that every keyboard-handler definition has a matching mouse handler (`mouseCount >= inputCount`; wrappers may expose more than one).
- [ ] `git diff --check`; grep the source for remaining hard-coded colour SGR and raw `"\x1b[A"`-style key literals.

---

## 12. Anti-patterns (fast lookup)

| Anti-pattern | Consequence | Fix |
|---|---|---|
| `handleMouse` returns only `{ render: true }` | silently discarded by `dispatchMouseEvent` | add `handled: true` |
| Hover handler omits `render: true` | `move` never repaints | explicit `render: true` on change |
| `press` returns `undefined` | no `click` is routed to the component | handle `press` |
| Hard-coded `\x1b[3x m` colours | breaks dark/light themes | `theme.fg(semantic, ...)` |
| Truncation strips all ANSI | long rows lose colour abruptly | ANSI-aware `fit` / `truncateToWidth` |
| Wrapper forwards raw `event.y` | clicks hit the wrong row | subtract header rows / border columns (§6) |
| `class X extends Container` + `TuiMouseEventResult` | TS2416 | drop unused inheritance (§7) |
| Top-level value import of pi-tui in a standalone extension | unit tests fail to resolve the package | deps injection / lazy dynamic import (§9) |
| Footer lists 9 shortcuts with 4 width fallbacks | jumpy, noisy, duplicates the help layer | 3 actions + grouped help (§10) |
| Designing mouse-only interactions | broken in regular mode and multiplexers | always keep a keyboard path |

---

*Companion docs: [`tui-beautiful-rendering.md`](tui-beautiful-rendering.md) (box drawing, overlays, badges), [`ui-components.md`](ui-components.md) (component & keyboard/theme quickref), Pi's own `docs/tui.md` in the coding-agent package.*
