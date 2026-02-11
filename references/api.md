# API Reference

Complete reference for Pi Extension API.

## ExtensionAPI

### Event Registration

```typescript
pi.on(event: string, handler: Function): void
```

Events: `session_start`, `session_shutdown`, `session_switch`, `agent_start`, `agent_end`, `turn_start`, `turn_end`, `tool_call`, `tool_result`, `input`, `context`

### Tool Registration

```typescript
pi.registerTool<TParams, TDetails>(tool: ToolDefinition<TParams, TDetails>): void

interface ToolDefinition<TParams, TDetails> {
  name: string;
  label: string;
  description: string;
  parameters: TSchema;
  execute: (toolCallId, params, signal, onUpdate, ctx) => Promise<AgentToolResult<TDetails>>;
  renderCall?: (args, theme) => Component;
  renderResult?: (result, options, theme) => Component;
}
```

### Command Registration

```typescript
pi.registerCommand(name: string, options: {
  description: string;
  getArgumentCompletions?: (prefix: string) => AutocompleteItem[];
  handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
}): void
```

### Shortcut Registration

```typescript
pi.registerShortcut(shortcut: KeyId, options: {
  description?: string;
  handler: (ctx: ExtensionContext) => Promise<void>;
}): void
```

### Flag Registration

```typescript
pi.registerFlag(name: string, options: {
  description?: string;
  type: "boolean" | "string";
  default?: boolean | string;
}): void

pi.getFlag(name: string): boolean | string | undefined
```

### Messaging

```typescript
pi.sendMessage(message: {
  customType: string;
  content: string;
  display: boolean;
  details?: unknown;
}, options?: {
  triggerTurn?: boolean;
  deliverAs?: "steer" | "followUp" | "nextTurn";
}): void

pi.sendUserMessage(content: string, options?: {
  deliverAs?: "steer" | "followUp";
}): void
```

### State Persistence

```typescript
pi.appendEntry<T>(type: string, data?: T): void
```

### Tool Management

```typescript
pi.getActiveTools(): string[]
pi.setActiveTools(toolNames: string[]): void
pi.getAllTools(): ToolInfo[]
```

### Model Control

```typescript
pi.setModel(model: Model): Promise<boolean>
pi.getThinkingLevel(): ThinkingLevel
pi.setThinkingLevel(level: ThinkingLevel): void
```

### Execution

```typescript
pi.exec(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>
```

### Event Bus

```typescript
pi.events.emit(event: string, data: unknown): void
pi.events.on(event: string, handler: Function): void
```

## ExtensionContext

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `ui` | `ExtensionUIContext` | UI methods |
| `hasUI` | `boolean` | UI available |
| `cwd` | `string` | Working directory |
| `sessionManager` | `ReadonlySessionManager` | Session access |
| `modelRegistry` | `ModelRegistry` | Model/API keys |
| `model` | `Model \| undefined` | Current model |

### Methods

```typescript
ctx.isIdle(): boolean
ctx.abort(): void
ctx.hasPendingMessages(): boolean
ctx.shutdown(): void
ctx.getContextUsage(): ContextUsage
```

## UI Context

### Dialogs

```typescript
ctx.ui.select(title: string, options: string[]): Promise<string | undefined>
ctx.ui.confirm(title: string, message: string, opts?: { timeout?: number }): Promise<boolean>
ctx.ui.input(title: string, placeholder?: string): Promise<string | undefined>
ctx.ui.editor(title: string, prefill?: string): Promise<string | undefined>
ctx.ui.custom<T>(factory, options?: { overlay?: boolean }): Promise<T>
```

### Status

```typescript
ctx.ui.notify(message: string, type?: "info" | "warning" | "error"): void
ctx.ui.setStatus(key: string, text?: string): void
ctx.ui.setWorkingMessage(message?: string): void
ctx.ui.setWidget(key: string, content?: string[] | ComponentFactory): void
```

### Editor

```typescript
ctx.ui.setEditorText(text: string): void
ctx.ui.getEditorText(): string
```
