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

### Session Metadata

```typescript
pi.setSessionName(name: string): void
pi.getSessionName(): string | undefined
pi.setLabel(entryId: string, label: string | undefined): void
```

### Command Discovery

```typescript
pi.getCommands(): Array<{
  name: string;
  description?: string;
  source: "extension" | "prompt" | "skill";
  location?: "user" | "project" | "path";
  path?: string;
}>
```

### Provider Registration

```typescript
pi.registerProvider(name: string, config: {
  baseUrl?: string;
  apiKey?: string;
  api?: string;
  headers?: Record<string, string>;
  authHeader?: boolean;
  models?: ModelDefinition[];
  oauth?: OAuthConfig;
  streamSimple?: StreamSimpleConfig;
}): void
```

### Message Rendering

```typescript
pi.registerMessageRenderer(customType: string, renderer: (
  message: CustomMessage,
  options: { expanded: boolean },
  theme: Theme
) => Component): void
```

### Dynamic Resources

```typescript
pi.on("resources_discover", () => ({
  skillPaths?: string[];
  promptPaths?: string[];
  themePaths?: string[];
}))
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
ctx.compact(options?): Promise<void>
ctx.getSystemPrompt(): string
```

### ExtensionCommandContext (extends ExtensionContext)

```typescript
ctx.waitForIdle(): Promise<void>
ctx.newSession(options?): Promise<void>
ctx.fork(entryId: string): Promise<void>
ctx.navigateTree(targetId: string, options?): Promise<void>
ctx.reload(): Promise<void>
```

## UI Context

### Dialogs

```typescript
ctx.ui.select(title: string, options: string[], opts?: { timeout?: number; signal?: AbortSignal }): Promise<string | undefined>
ctx.ui.confirm(title: string, message: string, opts?: { timeout?: number; signal?: AbortSignal }): Promise<boolean>
ctx.ui.input(title: string, placeholder?: string): Promise<string | undefined>
ctx.ui.editor(title: string, prefill?: string): Promise<string | undefined>
ctx.ui.custom<T>(factory, options?: { overlay?: boolean; overlayOptions?: OverlayOptions; onHandle?: (handle) => void }): Promise<T>
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
ctx.ui.pasteToEditor(text: string): void
ctx.ui.setEditorComponent(factory?: EditorFactory): void
ctx.ui.getToolsExpanded(): boolean
ctx.ui.setToolsExpanded(expanded: boolean): void
ctx.ui.setTitle(title: string): void
ctx.ui.setFooter(renderer?: FooterFactory): void
ctx.ui.getAllThemes(): ThemeInfo[]
ctx.ui.getTheme(name: string): Theme | undefined
ctx.ui.setTheme(nameOrTheme: string | Theme): { success: boolean; error?: string }
ctx.ui.theme: Theme  // Current theme
```

## RPC Mode Behavior

In RPC mode (`--mode rpc`), `ctx.hasUI` is `true` but some methods are degraded:

| Method | RPC Behavior |
|--------|-------------|
| `select/confirm/input/editor` | ✅ Works via JSON protocol |
| `notify/setStatus/setWidget/setTitle/setEditorText` | ✅ Fire-and-forget events |
| `custom()` | ❌ Returns `undefined` |
| `setWorkingMessage/setFooter/setHeader/setEditorComponent` | ❌ No-op |
| `getEditorText()` | Returns `""` |
| `getAllThemes()` | Returns `[]` |

See [RPC Mode Guide](../guides/05-rpc-mode.md) for compatibility patterns.
