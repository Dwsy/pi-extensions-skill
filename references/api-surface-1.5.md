# Current API Surface (Pi 1.5.0) — Gaps & Corrections

> **Fact source**: `@earendil-works/pi-coding-agent` 1.5.0 `dist/core/extensions/types.d.ts`, `dist/index.d.ts`, and `docs/extensions.md` (3347 lines). Verified against the skill's 24 markdown files.
> **Read this when**: an extension compiles but a handler never fires, `ctx.*` / `ctx.ui.*` looks missing, or you need the full event list. The other skill docs were written against an older API surface — treat them as narrative, treat this file + the shipped `.d.ts` as authority.

---

## 1. Corrections to existing skill docs

| Location in this skill | What older docs said | Pi 1.5.0 reality | Status |
|---|---|---|---|
| `references/events.md` §`session_before_switch / session_switch` | `pi.on("session_switch", ...)` is subscribable | **No such event** in `ExtensionEvent` or `docs/extensions.md` | ✅ Fixed — example removed, section renamed |
| `references/events.md` §`session_before_fork / session_fork` | `pi.on("session_fork", ...)` is subscribable | **No such event**; only `session_before_fork` | ✅ Fixed — example removed, section renamed |
| `references/api-quickref.md` Events list | lists `session_switch` and `session_fork` | both absent from 1.5.0 | ✅ Fixed — replaced with explanatory comments |
| `assets/templates/full-extension.ts` | `pi.on("session_fork", ...)` handler | no post-fork event | ✅ Fixed — handler removed; use `session_start` / `session_tree` to restore branch state |
| `SKILL.md`, `README.md`, `guides/01`, `guides/02`, `PATTERNS.md`, two `assets/templates` | `ctx.ui.notify(msg, "success")` | `notify(message, type?: "info" \| "warning" \| "error")` — **"success" is a type error** | ✅ Fixed — all changed to `"info"` |
| `README.md` | links to `CONTRIBUTING.md` | file does not exist in this skill | ✅ Fixed — link removed |
| `ARCHITECTURE.md` §3 ExtensionAPI table | 16 methods | 32 distinct methods (plus 42 `on` overloads) | Superseded by §2 below |
| `ARCHITECTURE.md` §4 `ExtensionContext` | 12 fields/methods | 18 fields/methods | Superseded by §3 below |
| `ARCHITECTURE.md` §4 `ExtensionCommandContext` | 6 command-only methods | 7 declared on the interface; `sendMessage` / `sendUserMessage` are command-only actions | Superseded by §3 below |
| `references/events.md` | ~20 events | **42** events | Superseded by §5 below |
| `SKILL.md` Quick Import Cheat Sheet / docs map | TUI value imports shown without caveat | Standalone extensions may not resolve the package in unit tests | See [`tui-mouse-interaction.md`](tui-mouse-interaction.md) §9 |

**`pi.on(event, handler)` returns `() => void`** — an unsubscribe function. Every overload has it; long-lived resources should store and call it on shutdown. None of the earlier skill docs mention this.

All skill markdown and TypeScript templates were also translated to English in the same pass (~392 lines); the codebase is now uniformly English with zero CJK characters.

Event payload/result shapes that were checked and are **still correct**: `input` (`{action: "continue"|"transform"|"handled"}`), `tool_call` (`{block?, reason?, terminate?}`), `tool_result` (`{content?, details?, isError?, ...}`), `before_agent_start` (`{message?, systemPrompt?}`), `context` (`{messages?}`), `session_before_fork` (`{cancel?, skipConversationRestore?}`), `session_before_switch` (`{cancel?}`).

---

## 2. `ExtensionAPI` — complete method list (1.5.0)

Registration:

| Method | Notes |
|---|---|
| `on(event, handler)` | 42 typed overloads; returns unsubscribe `() => void` |
| `registerTool(definition)` | generic over TypeBox params / details / state |
| `registerCommand(name, options)` | `Omit<RegisteredCommand, "name" \| "sourceInfo">` |
| `registerShortcut(shortcut: KeyId, options)` | |
| `registerFlag(name, options)` / `getFlag(name)` | `boolean \| string \| undefined` |
| `registerMessageRenderer(customType, renderer)` | |
| `registerMarkdownTransformer(transformer)` | **not in older skill docs** |
| `registerEntryRenderer(customType, renderer)` | **not in older skill docs** |
| `registerToolRenderer(resolver)` | **not in older skill docs** |
| `registerProvider(provider \| name, config?)` / `unregisterProvider(name)` | unregister is new |
| `registerMcpServer(name, config)` / `unregisterMcpServer(name)` / `getMcpServers()` | **not in older skill docs** |
| `registerVirtualModel(model)` / `unregisterVirtualModel(provider, id)` | **not in older skill docs** |

Runtime / session:

| Method | Notes |
|---|---|
| `sendMessage(message, options?)` / `sendUserMessage(content, options?)` | |
| `appendEntry(customType, data?)` | |
| `setSessionName` / `getSessionName` / `setLabel` | |
| `exec(command, args, options?)` | `Promise<ExecResult>` |
| `getActiveTools()` / `getAllTools()` / `setActiveTools(names)` | |
| `getCommands()` | `SlashCommandInfo[]` |
| `getSettings()` | `Settings` — **not in older skill docs** |
| `setModel(model)` | `Promise<boolean>` — **async**, await it |
| `getThinkingLevel()` / `setThinkingLevel(level)` | |
| `events` | `EventBus`, inter-extension bus |

`pi.setModel` returning a Promise is a common footgun: ignoring it races the next turn.

---

## 3. `ExtensionContext` / `ExtensionCommandContext`

`ExtensionContext` (18 members):

| Member | Type / signature | Missing from ARCHITECTURE §4? |
|---|---|---|
| `ui` | `ExtensionUIContext` | |
| `mode` | `ExtensionMode` | ✅ missing |
| `hasUI` | `boolean` | |
| `cwd` | `string` | |
| `sessionManager` | `ReadonlySessionManager` | |
| `modelRegistry` | `ModelRegistry` | |
| `model` | `Model \| undefined` | |
| `scopedModels` | `readonly ScopedModel[]` | ✅ missing |
| `thinkingLevel` | `ThinkingLevel?` | ✅ missing |
| `signal` | `AbortSignal \| undefined` | ✅ missing — use it in long-running handlers |
| `tools` | `readonly AgentTool[]` | ✅ missing |
| `isIdle()` / `abort()` / `hasPendingMessages()` / `shutdown()` | | |
| `isProjectTrusted()` | `boolean` | ✅ missing |
| `executeTool(name, args, options?)` | `Promise<AgentToolCallOutcome>` | ✅ missing |
| `getContextUsage()` / `compact(options?)` / `getSystemPrompt()` | | |

`ExtensionCommandContext extends ExtensionContext` adds:
`getSystemPromptOptions()`, `waitForIdle()`, `newSession(options?)`, `fork(entryId, options?)`, `navigateTree(targetId, options?)`, `switchSession(sessionPath, options?)`, `reload()`.
The four session-changing methods resolve to `{ cancelled: boolean }` — check it before proceeding. `sendMessage` / `sendUserMessage` are also available on command contexts (declared on `ExtensionCommandContextActions`).

> Session-replacement footguns (`newSession` / `fork` / `switchSession` / `reload` during an active turn) are documented in `docs/extensions.md` §`Session replacement lifecycle and footguns`. This skill's `guides/03-state.md` predates those APIs.

---

## 4. `ExtensionUIContext` — methods the older docs omit

Dialogs: `select`, `confirm`, `input`, `editor`, `notify`, `custom<T>(factory)`.

Status / chrome: `setStatus(key, text)`, `setTitle`, `setWidget` (string[] or component factory), `setFooter(factory)`, `setHeader(factory)`, `setWorkingMessage`, `setWorkingVisible`, `setWorkingIndicator`, `setHiddenThinkingLabel`, `getToolsExpanded` / `setToolsExpanded`.

Editor: `pasteToEditor`, `setEditorText`, `getEditorText`, `addAutocompleteProvider(factory)`, `setEditorComponent(factory)` / `getEditorComponent()`.

Terminal / themes: `onTerminalInput(handler) → () => void`, `readonly theme: Theme`, `getAllThemes()`, `getTheme(name)`, `setTheme(theme)`.

**Newer than this skill's UI chapters**: `setHeader`, `setWorkingIndicator`, `setHiddenThinkingLabel`, `getEditorComponent`, `onTerminalInput`, `addAutocompleteProvider`, and the theme getters/setters.

RPC caveat still holds: `ctx.hasUI` is `true` in RPC but `custom()` returns `undefined`; the UI request protocol is in `docs/rpc-extension-ui.md` and summarised in [`guides/05-rpc-mode.md`](../guides/05-rpc-mode.md) §`RPC Extension UI Protocol Summary`.

---

## 5. Complete event list (42)

Legend: ✅ covered in `references/events.md`, ❌ missing, ⚠️ documented there but **does not exist**.

| Group | Event | Handler result | Skill |
|---|---|---|---|
| Startup / resources | `project_trust` | `ProjectTrustHandler` | ❌ |
| | `resources_discover` | `ResourcesDiscoverResult` | ✅ |
| | `mcp_servers_change` | — | ❌ |
| Session | `session_start` | — | ✅ |
| | `session_info_changed` | — | ❌ |
| | `session_before_switch` | `{cancel?}` | ✅ |
| | `session_switch` | — | ⚠️ **fictional, remove** |
| | `session_before_fork` | `{cancel?, skipConversationRestore?}` | ✅ |
| | `session_fork` | — | ⚠️ **fictional, remove** |
| | `session_before_compact` | `{cancel?, compaction?}` | ✅ |
| | `session_compact` | — | ✅ |
| | `session_compact_failed` | — | ❌ |
| | `session_shutdown` | — | ✅ |
| | `session_before_tree` | `{cancel?, summary?, customInstructions?, replaceInstructions?, label?}` | ✅ |
| | `session_tree` | — | ✅ |
| Context / agent | `context` | `{messages?}` | ✅ |
| | `context_with_system` | `{messages?}` | ❌ |
| | `cache_warming_decision` | `CacheWarmingDecisionEventResult` | ❌ |
| | `before_agent_start` | `{message?, systemPrompt?}` | ✅ |
| | `agent_start` / `agent_end` | — | ✅ |
| | `agent_before_settle` | `BoundaryResult` | ❌ |
| | `agent_settled` | — | ❌ |
| | `ui_prompt_start` / `ui_prompt_end` | — | ❌ |
| | `turn_start` | — | ✅ |
| | `turn_end` | `BoundaryResult` | ✅ |
| Provider | `before_provider_request` | `unknown` | ❌ |
| | `before_provider_headers` | — | ❌ |
| | `after_provider_response` | — | ❌ |
| | `provider_stream_event` | — | ❌ |
| Message / tool | `message_start` / `message_update` | — | ❌ |
| | `message_end` | `{message?}` | ❌ |
| | `tool_execution_start` / `tool_execution_update` / `tool_execution_end` | — | ❌ |
| | `tool_call` | `{block?, reason?, terminate?}` | ✅ |
| | `tool_result` | `{content?, details?, structuredContent?, isError?, usage?}` | ✅ |
| Model / input | `model_select` | — | ✅ |
| | `thinking_level_select` | — | ❌ |
| | `input` | `{action: "continue"\|"transform"\|"handled"}` | ✅ |
| | `user_bash` | `UserBashEventResult` | ✅ |

`ExtensionEvent` is a union of these; subscribing to a name outside it is a type error in TypeScript — another reason the two fictional events are dangerous (they were presented in untyped prose).

---

## 6. Official docs this skill does not navigate to

The skill is a *master reference for extension code*. These shipped docs are the authority for surrounding mechanics; add links, do not copy their contents:

| Topic | Official doc | Why an extension author needs it |
|---|---|---|
| Extension loading, `+`/`-` entries, packages | `docs/packages.md`, `docs/settings.md` | `settings.json` `extensions` / `packages` arrays are the only authoritative load list |
| Skills & prompt templates | `docs/skills.md`, `docs/prompt-templates.md`, `docs/slash-commands.md` | `/command` and skill discovery overlap with `registerCommand` |
| Themes | `docs/themes.md` | `ctx.ui.setTheme` / semantic colour names |
| Keybindings | `docs/keybindings.md` | `registerShortcut(shortcut: KeyId, ...)` id list |
| MCP | `docs/mcp.md` | `registerMcpServer` / `mcp_servers_change` |
| RPC | `docs/rpc.md`, `docs/rpc-commands.md`, `docs/rpc-extension-ui.md` | see `guides/05-rpc-mode.md` |
| Virtual models | `docs/virtual-models.md` | `registerVirtualModel` |
| TUI / terminal | `docs/tui.md`, `docs/terminal-setup.md`, `docs/keybindings.md` | see [`tui-mouse-interaction.md`](tui-mouse-interaction.md) |
| Extension mechanics | `docs/extensions.md` §`Extension Styles`, `Async factory functions`, `Long-lived resources and shutdown`, `Remote Execution`, `Output Truncation`, `Dynamic Tool Loading`, `Tool Exposure`, `Calling Other Tools` | not covered by the 38 patterns in `PATTERNS.md` |

---

## 7. How to re-verify after a Pi upgrade

```bash
P="$(npm root -g 2>/dev/null)/@earendil-works/pi-coding-agent"   # or the installed release dir
# On this machine: ~/.pi/agent/install/releases/<version>/node_modules/@earendil-works/pi-coding-agent
rg -n 'export interface (ExtensionAPI|ExtensionContext|ExtensionCommandContext|ExtensionUIContext)' "$P/dist/core/extensions/types.d.ts"
rg -n 'on\(event: "' "$P/dist/core/extensions/types.d.ts"          # authoritative event list
rg -n '^## |^### ' "$P/docs/extensions.md"                          # behaviour / footguns
```

Compare against this file, then update the tables here first — `ARCHITECTURE.md` and `references/events.md` are narrative and should keep pointing at this file rather than duplicating the full lists.

---

*Companion docs: [`tui-mouse-interaction.md`](tui-mouse-interaction.md) (mouse + theming contracts), [`events.md`](events.md) (event payload narrative), [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (mental model).*
