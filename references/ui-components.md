# Pi Extensions UI Components Reference

## Dialogs

### Select

```typescript
const choice = await ctx.ui.select("Title:", ["Option 1", "Option 2", "Option 3"]);
// returns the selected string, or undefined when cancelled
```

### Confirm

```typescript
const ok = await ctx.ui.confirm("Title", "Message body");
// returns boolean

// with timeout
const confirmed = await ctx.ui.confirm("Title", "Message", { timeout: 5000 });

// with AbortSignal
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
const confirmed = await ctx.ui.confirm("Title", "Message", { signal: controller.signal });
```

### Input

```typescript
const name = await ctx.ui.input("Name:", "Placeholder text");
// returns the entered string, or undefined when cancelled
```

### Editor

```typescript
const text = await ctx.ui.editor("Edit:", "Prefilled text");
// returns the edited text, or undefined when cancelled
```

### Custom Component

```typescript
const result = await ctx.ui.custom((tui, theme, keybindings, done) => {
  return {
    render(width) {
      return [theme.fg("accent", "Custom UI")];
    },
    invalidate() {},
    handleInput(data) {
      if (data === "return") done("result");
    },
  };
});

// overlay mode
const result = await ctx.ui.custom(
  (tui, theme, keybindings, done) => new MyComponent({ onClose: done }),
  { overlay: true }
);
```

## Status Controls

### Notify

```typescript
ctx.ui.notify("Message", "info");      // informational
ctx.ui.notify("Warning", "warning");   // warning
ctx.ui.notify("Error", "error");       // error
// 1.5.0 accepts only "info" | "warning" | "error" — there is no "success" type
```

### Status Bar

```typescript
ctx.ui.setStatus("my-ext", "Working...");
ctx.ui.setStatus("my-ext", undefined); // clear
```

### Widget

```typescript
// above the editor (default)
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"]);

// below the editor
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"], { placement: "belowEditor" });

// custom component
ctx.ui.setWidget("my-widget", (tui, theme) => new Text(...));

// clear
ctx.ui.setWidget("my-widget", undefined);
```

### Working Message

```typescript
ctx.ui.setWorkingMessage("Thinking...");
ctx.ui.setWorkingMessage(); // restore default
```

### Editor Text

```typescript
ctx.ui.setEditorText("Prefilled text");
const current = ctx.ui.getEditorText();
```

### Tool Expansion

```typescript
const wasExpanded = ctx.ui.getToolsExpanded();
ctx.ui.setToolsExpanded(true);
```

### Terminal Title

```typescript
ctx.ui.setTitle("pi - my-project");
```

### Custom Footer

```typescript
ctx.ui.setFooter((tui, theme) => ({
  render(width) {
    return [theme.fg("dim", "Custom footer")];
  },
  invalidate() {},
}));

ctx.ui.setFooter(undefined); // restore default
```

### Custom Editor

```typescript
import { CustomEditor } from "@earendil-works/pi-coding-agent";

class VimEditor extends CustomEditor {
  private mode: "normal" | "insert" = "insert";

  handleInput(data: string): void {
    // handle input...
    super.handleInput(data); // forward unhandled keys
  }
}

ctx.ui.setEditorComponent((tui, theme, keybindings) =>
  new VimEditor(theme, keybindings)
);

ctx.ui.setEditorComponent(undefined); // restore default
```

## TUI Components

### Text

```typescript
import { Text } from "@earendil-works/pi-tui";

new Text("Content", paddingX, paddingY);
```

### Container

```typescript
import { Container } from "@earendil-works/pi-tui";

const container = new Container();
container.addChild(component);
```

### Editor

```typescript
import { Editor } from "@earendil-works/pi-tui";

const editor = new Editor(tui, {
  borderColor: (s) => theme.fg("accent", s),
});

editor.onSubmit = (value) => console.log(value);
editor.setText("Prefilled text");
const lines = editor.render(width);
editor.handleInput(data);
```

### SettingsList

```typescript
import { SettingsList, getSettingsListTheme } from "@earendil-works/pi-tui";

const settingsList = new SettingsList(
  items,                    // SettingItem[]
  maxHeight,                // maximum height
  getSettingsListTheme(),   // theme
  onValueChange,            // (id, newValue) => void
  onClose,                  // () => void
  onNewItem                 // (text) => void (optional, adds new items)
);
```

### BorderedLoader

```typescript
import { BorderedLoader } from "@earendil-works/pi-coding-agent";

const loader = new BorderedLoader(tui, theme, "Loading...");
loader.onAbort = () => done(null);
loader.signal // AbortSignal
```

## Keyboard Handling

```typescript
import { matchesKey, Key } from "@earendil-works/pi-tui";

if (matchesKey(data, Key.up)) { /* up arrow */ }
if (matchesKey(data, Key.down)) { /* down arrow */ }
if (matchesKey(data, Key.enter)) { /* enter */ }
if (matchesKey(data, Key.escape)) { /* ESC */ }
if (matchesKey(data, Key.tab)) { /* Tab */ }
```

> Mouse wheel / click / hover, `rowMap` hit-testing, wrapper coordinate translation and theming pitfalls: see [`tui-mouse-interaction.md`](tui-mouse-interaction.md).

## Theme Colors

```typescript
// foreground colors
theme.fg("toolTitle", text)   // tool name
theme.fg("accent", text)      // highlight
theme.fg("success", text)     // success (green)
theme.fg("error", text)       // error (red)
theme.fg("warning", text)     // warning (yellow)
theme.fg("muted", text)       // secondary text
theme.fg("dim", text)         // tertiary text

// styles
theme.bold(text)
theme.italic(text)
theme.strikethrough(text)
```

## Syntax Highlighting

```typescript
import { highlightCode, getLanguageFromPath } from "@earendil-works/pi-coding-agent";

const highlighted = highlightCode(code, "typescript", theme);

const lang = getLanguageFromPath("/path/to/file.rs"); // "rust"
```
