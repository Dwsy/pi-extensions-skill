# Pi Extensions API Quick Reference

> **Note:** This is a Pi Extensions development reference. For project-specific tools (database commands, deployment, etc.), see your project's `.pi/skills/` directory.

## ExtensionAPI

### Events

```typescript
pi.on("session_start", handler)
pi.on("session_shutdown", handler)
pi.on("session_before_switch", handler)
// 1.5.0: no session_switch event exists
pi.on("session_before_fork", handler)
// 1.5.0: no session_fork event exists
pi.on("session_before_compact", handler)
pi.on("session_compact", handler)
pi.on("session_before_tree", handler)
pi.on("session_tree", handler)
pi.on("before_agent_start", handler)
pi.on("agent_start", handler)
pi.on("agent_end", handler)
pi.on("turn_start", handler)
pi.on("turn_end", handler)
pi.on("context", handler)
pi.on("tool_call", handler)
pi.on("tool_result", handler)
pi.on("input", handler)
pi.on("user_bash", handler)
pi.on("model_select", handler)
```

### Registration Methods

```typescript
pi.registerTool(definition)
pi.registerCommand(name, options)
pi.registerShortcut(key, options)
pi.registerFlag(name, options)
pi.registerMessageRenderer(customType, renderer)
pi.registerProvider(name, config)
```

### Messages and State

```typescript
pi.sendMessage(message, options)
pi.sendUserMessage(content, options)
pi.appendEntry(customType, data)
pi.setSessionName(name)
pi.getSessionName()
pi.setLabel(entryId, label)
```

### Tool Management

```typescript
pi.getActiveTools()
pi.getAllTools()
pi.setActiveTools(names)
```

### Other

```typescript
pi.exec(command, args, options)
pi.getFlag(name)
pi.getCommands()
pi.setModel(model)
pi.getThinkingLevel()
pi.setThinkingLevel(level)
pi.events.on(event, handler)
pi.events.emit(event, data)
```

## ExtensionContext

### UI Methods

```typescript
ctx.ui.select(title, options)
ctx.ui.confirm(title, message, options?)
ctx.ui.input(title, placeholder?)
ctx.ui.editor(title, text?)
ctx.ui.custom(factory, options?)
ctx.ui.notify(message, type)
ctx.ui.setStatus(id, text?)
ctx.ui.setWidget(id, content, options?)
ctx.ui.setWorkingMessage(text?)
ctx.ui.setEditorText(text)
ctx.ui.getEditorText()
ctx.ui.getToolsExpanded()
ctx.ui.setToolsExpanded(expanded)
ctx.ui.setTitle(title)
ctx.ui.setFooter(renderer?)
ctx.ui.setEditorComponent(factory?)
ctx.ui.setTheme(nameOrTheme)
```

### Properties

```typescript
ctx.hasUI           // boolean
ctx.cwd            // string
ctx.sessionManager // SessionManager
ctx.modelRegistry  // ModelRegistry
ctx.model          // Model | undefined
```

### Methods

```typescript
ctx.isIdle()
ctx.abort()
ctx.hasPendingMessages()
ctx.shutdown()
ctx.getContextUsage()
ctx.compact(options)
ctx.getSystemPrompt()
```

## ExtensionCommandContext

Extends `ExtensionContext` and adds:

```typescript
ctx.waitForIdle()
ctx.newSession(options?)
ctx.fork(entryId)
ctx.navigateTree(targetId, options?)
```

## Type Definitions

### ToolDefinition

```typescript
{
  name: string;
  label: string;
  description: string;
  parameters: TObject; // TypeBox
  execute: (toolCallId, params, signal, onUpdate, ctx) => Promise<ToolResult>;
  renderCall?: (args, theme) => Component;
  renderResult?: (result, options, theme) => Component;
}
```

### CommandOptions

```typescript
{
  description: string;
  getArgumentCompletions?: (prefix) => AutocompleteItem[] | null;
  handler: (args, ctx) => Promise<void>;
}
```

### Event Handlers

```typescript
// session_before_switch
(event: { reason: "new" | "resume"; targetSessionFile?: string }, ctx) =>
  { cancel?: boolean } | void

// before_agent_start
(event: { prompt; images; systemPrompt }, ctx) =>
  { message?; systemPrompt? } | void

// tool_call
(event: { toolName; toolCallId; input }, ctx) =>
  { block: true; reason } | void

// input
(event: { text; images; source }, ctx) =>
  { action: "continue" | "transform" | "handled"; text? } | void
```

## Tool Result Types

```typescript
interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  details?: Record<string, unknown>;
  isError?: boolean;
}
```

## Common Imports

```typescript
// core types
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// type guards
import { isToolCallEventType, isBashToolResult } from "@earendil-works/pi-coding-agent";

// truncation helpers
import {
  truncateHead,
  truncateTail,
  formatSize,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";

// TUI components
import { Text, Container, Editor, matchesKey, Key } from "@earendil-works/pi-tui";

// TypeBox
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@earendil-works/pi-ai";
```
