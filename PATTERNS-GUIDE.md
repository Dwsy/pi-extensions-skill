# Pi Extension Patterns — Quick Navigation Guide

> 43 production-grade patterns organized by **use case** instead of number.

---

## 🚀 Getting Started

| If you want to... | Use Pattern | Key APIs |
|-------------------|-------------|----------|
| Create first extension | [Minimal Extension](#p1-minimal-extension) | `pi.registerCommand` |
| Add LLM-callable tool | [Tool Registration](#p2-tool-registration) | `pi.registerTool` + TypeBox |
| Build interactive TUI | [Custom UI Widget](#p14-custom-ui-widget) | `ctx.ui.custom` + Container/Text |
| Persist state across sessions | [State Persistence](#p15-state-persistence) | `pi.appendEntry` |

---

## 🛠️ Tools & Commands

### Tools (LLM-Callable)

| Pattern | Purpose | Complexity |
|---------|---------|------------|
| [P2. Tool Registration](#p2-tool-registration) | Basic tool with parameters | ⭐ |
| [P3. Tool with Streaming Progress](#p3-tool-with-streaming-progress) | Long-running with progress updates | ⭐⭐ |
| [P4. Override Built-in Tool](#p4-override-built-in-tool) | Wrap/replace `read`/`grep`/`bash` | ⭐⭐ |
| [P25. Tool Enhancement with External Engine](#p25-tool-enhancement-with-external-engine) | FFF-style fuzzy path + grep | ⭐⭐⭐⭐ |
| [P31. Tool Result Interception](#p31-tool-result-interception) | Transform output before display | ⭐⭐ |
| [P41. Experiment Loop Infrastructure](#p41-experiment-loop-infrastructure) | `run_experiment` + `log_experiment` | ⭐⭐⭐⭐⭐ |

### Commands (User-Triggered)

| Pattern | Purpose | Complexity |
|---------|---------|------------|
| [P6. Command Registration](#p6-command-registration) | `/command` handler | ⭐ |
| [P7. Command with Autocomplete](#p7-command-with-autocomplete) | Tab completion for args | ⭐⭐ |
| [P23. Model Switch on Command](#p23-model-switch-on-command) | `/fast` → switch to haiku | ⭐⭐ |
| [P26. Feature Flags & Runtime State](#p26-feature-flags--runtime-state) | `/features` toggle UI | ⭐⭐⭐ |
| [P37. Conditional Activation](#p37-conditional-activation) | Require `/acm` before enabling | ⭐⭐⭐ |

---

## 🎛️ State & Configuration

### Persistence Strategies

| Pattern | Mechanism | Survives |
|---------|-----------|----------|
| [P15. State Persistence](#p15-state-persistence) | `pi.appendEntry()` | Turn end ✓, Compaction ✗ |
| [P16. Branch-Resilient State](#p16-branch-resilient-state) | `session_before_tree` hook | Turn end ✓, Checkout ✓ |
| [P24. Load State from Session](#p24-load-state-from-session) | Scan `toolResult` messages | Any custom location |
| [P32. Type-Safe Config Store](#p32-type-safe-config-store) | JSON file + Zod validation | Restart ✓ |
| [P35. Session Entry Persistence](#p35-session-entry-persistence) | `custom_message` entries | Turn end ✓, Compaction ✓ |

### Configuration Patterns

| Pattern | Use Case |
|---------|----------|
| [P30. Pure Config Extension](#p30-pure-config-extension) | `config.json` → tool overrides |
| [P32. Type-Safe Config Store](#p32-type-safe-config-store) | Schema + validation + env override |

---

## 🎨 UI & Visualization

### TUI Components

| Pattern | Widget | Interactivity |
|---------|--------|---------------|
| [P12. Custom UI: Select Dialog](#p12-custom-ui-select-dialog) | `SelectList` | Arrow keys + Enter |
| [P13. Custom UI: Timer-based Confirmation](#p13-custom-ui-timer-based-confirmation) | `ctx.ui.confirm` | Timeout auto-cancel |
| [P14. Custom UI: Widget](#p14-custom-ui-widget) | `setWidget` | Persistent status |

### Web View (macOS)

| Pattern | Technology | Use Case |
|---------|------------|----------|
| [P42. Widget Streaming with Morphdom](#p42-widget-streaming-with-morphdom) | `glimpseui` + `morphdom` | HTML/SVG widgets |

### Message Rendering

| Pattern | Output | Expandable |
|---------|--------|----------|
| [P18. Custom Message Renderer](#p18-custom-message-renderer) | Inline text | ✓ |
| [P43. Custom Message Renderer](#p43-custom-message-renderer) | Border boxes + status icons | ✓ |

---

## ⚡ Event Hooks & Interception

### Lifecycle Hooks

| Pattern | Trigger | Common Use |
|---------|---------|------------|
| [P8. Event: Block Dangerous Bash](#p8-event-block-dangerous-bash) | `tool_call` (bash) | Safety gating |
| [P9. Event: Modify Tool Result](#p9-event-modify-tool-result) | `tool_result` | Pretty-print JSON |
| [P10. Event: Inject System Prompt](#p10-event-inject-system-prompt) | `before_agent_start` | Add instructions |
| [P11. Event: Transform User Input](#p11-event-transform-user-input) | `input` | Shortcuts (`?quick`) |
| [P36. Deferred Execution Pattern](#p36-deferred-execution-pattern) | `turn_end` / `agent_end` | Navigation after LLM |
| [P22. Compaction Hook](#p22-compaction-hook) | `session_before_compact` | Custom compaction |

### Advanced Interception

| Pattern | Layer | Example |
|---------|-------|---------|
| [P34. Command Rewriting Pipeline](#p34-command-rewriting-pipeline) | Pre-execution | `rm -rf` → `trash` |
| [P31. Tool Result Interception](#p31-tool-result-interception) | Post-execution | Compact test output |

---

## 🔧 Editor & IDE Features

| Pattern | Feature | Implementation |
|---------|---------|----------------|
| [P29. Editor Autocomplete Integration](#p29-editor-autocomplete-integration) | `@path` fuzzy completion | `AutocompleteProvider` |
| [P27. Fuzzy Path Resolution](#p27-fuzzy-path-resolution) | Typo-tolerant file paths | `resolvePath()` strategy |
| [P28. Cursor-based Pagination](#p28-cursor-based-pagination) | Large result sets | Base64-encoded cursors |

---

## 🌐 Integration & Orchestration

### External Systems

| Pattern | Integration | Complexity |
|---------|-------------|------------|
| [P17. Inter-Extension Communication](#p17-inter-extension-communication) | `pi.events.emit/on` | ⭐⭐ |
| [P19. Dynamic Provider Registration](#p19-dynamic-provider-registration) | Custom model providers | ⭐⭐⭐ |
| [P20. OAuth Provider](#p20-oauth-provider) | `/login` flow | ⭐⭐⭐⭐ |
| [P39. Terminal Multiplexer Abstraction](#p39-terminal-multiplexer-abstraction) | cmux/tmux/zellij | ⭐⭐⭐ |

### Subagent Orchestration

| Pattern | Capabilities |
|---------|--------------|
| [P40. Subagent Orchestration](#p40-subagent-orchestration) | Spawn, monitor, resume, result aggregation |

---

## 🧠 Intelligence & Context

### Context Management

| Pattern | Function |
|---------|----------|
| [P38. Auto-Milestone Detection](#p38-auto-milestone-detection) | Auto-tag User messages, branch points |
| [P35. Session Entry Persistence](#p35-session-entry-persistence) | Cross-turn state in `custom_message` |

### Monitoring & Feedback

| Pattern | Mechanism |
|---------|-----------|
| [P33. Bounded Notice Tracker](#p33-bounded-notice-tracker) | LRU deduplication (100 entries max) |
| [P41. Experiment Loop Infrastructure](#p41-experiment-loop-infrastructure) | Confidence scoring, metric tracking |

---

## 🛡️ Safety & Compatibility

| Pattern | Risk Addressed |
|---------|----------------|
| [P5. Safe File Mutation](#p5-safe-file-mutation) | Race conditions on `edit`/`write` |
| [P21. RPC-Safe Extension](#p21-rpc-safe-extension) | `ctx.ui.custom` unavailable in RPC |
| [P8. Block Dangerous Bash](#p8-event-block-dangerous-bash) | `rm -rf /` prevention |

---

## 📊 Complexity Index

| Level | Patterns | Characteristics |
|-------|----------|-----------------|
| ⭐ | P1, P2, P6 | Single API call |
| ⭐⭐ | P3, P4, P7, P9, P10, P11, P12, P13, P15, P17, P18, P21, P31 | Event hooks, simple state |
| ⭐⭐⭐ | P14, P16, P23, P24, P26, P30, P32, P37 | Multi-file, persistence |
| ⭐⭐⭐⭐ | P19, P20, P22, P25, P27, P28, P29, P33, P34, P38, P39, P40, P42 | External deps, complex state |
| ⭐⭐⭐⭐⭐ | P35, P36, P41, P43 | Session lifecycle, full orchestration |

---

## 🔗 Cross-Reference: Original → Guide

| Original Pattern | Category | Guide Section |
|------------------|----------|---------------|
| P1 | Foundation | 🚀 Getting Started |
| P2-P5 | Tools | 🛠️ Tools & Commands |
| P6-P7, P23, P26, P37 | Commands | 🛠️ Tools & Commands |
| P8-P11, P22, P36 | Events | ⚡ Event Hooks & Interception |
| P12-P14, P42, P18, P43 | UI | 🎨 UI & Visualization |
| P15-P16, P24, P32, P35 | State | 🎛️ State & Configuration |
| P17 | Communication | 🌐 Integration & Orchestration |
| P19-P20 | Providers | 🌐 Integration & Orchestration |
| P21 | RPC | 🛡️ Safety & Compatibility |
| P25, P27-P29 | Editor/Search | 🔧 Editor & IDE Features |
| P30, P32 | Config | 🎛️ State & Configuration |
| P31, P34 | Interception | ⚡ Event Hooks & Interception |
| P33, P41 | Monitoring | 🧠 Intelligence & Context |
| P38 | Context | 🧠 Intelligence & Context |
| P39-P40 | Subagents | 🌐 Integration & Orchestration |

---

*This guide complements PATTERNS.md — use it for initial selection, then refer to full pattern for implementation details.*
