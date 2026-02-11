# State Management

Extensions can maintain state across turns, sessions, and even browser navigation.

---

## State Lifetimes

| Type | Scope | Persistence | Use Case |
|------|-------|-------------|----------|
| **Ephemeral** | Current turn | Memory only | Counters, flags |
| **Session** | Current session | `appendEntry` | User preferences |
| **Persistent** | Across sessions | Filesystem | Configuration |
| **Branch-Resilient** | Session + tree nav | `appendEntry` + events | Complex workflows |

---

## Ephemeral State

Simple variables that reset each session.

```typescript
let counter = 0;

pi.on("turn_end", () => {
  counter++;
});
```

**Use for:** Caches, rate limiting, temporary flags.

---

## Session-Persistent State

Use `appendEntry` to save state in the session file.

### Saving State

```typescript
interface MyState {
  version: number;
  preferences: { theme: string };
  history: string[];
}

function saveState(pi: ExtensionAPI, state: MyState) {
  pi.appendEntry("my-extension", {
    version: 1,
    ...state,
  });
}
```

### Loading State

```typescript
function loadState(entries: SessionEntry[]): MyState | null {
  // Search backwards for latest entry
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "custom" && entry.customType === "my-extension") {
      return entry.data as MyState;
    }
  }
  return null;
}

// On session start
pi.on("session_start", async (_event, ctx) => {
  const entries = ctx.sessionManager.getEntries();
  const state = loadState(entries);
  if (state) {
    console.log("Restored state:", state);
  }
});
```

---

## Branch-Resilient State

Handle tree navigation (branching, switching) gracefully.

```typescript
class ResilientState<T> {
  private state: T;
  private version = 0;

  constructor(
    private pi: ExtensionAPI,
    private type: string,
    private defaultState: T
  ) {
    this.state = { ...defaultState };
    this.registerHandlers();
  }

  private registerHandlers() {
    // Save before tree navigation
    this.pi.on("session_before_tree", async () => {
      this.sync();
    });

    // Restore after navigation
    this.pi.on("session_tree", async () => {
      this.load();
    });

    // Save before compaction
    this.pi.on("session_before_compact", async () => {
      this.sync();
    });
  }

  private sync() {
    this.pi.appendEntry(this.type, {
      version: ++this.version,
      data: this.state,
    });
  }

  private load() {
    const entries = this.pi./* get entries */;
    // ... load logic
  }

  get(): T {
    return this.state;
  }

  update(updater: (s: T) => void) {
    updater(this.state);
    this.sync();
  }
}
```

---

## Cross-Extension Communication

Use the event bus for inter-extension messaging.

```typescript
// Extension A: Emit
pi.events.emit("myapp:data", { key: "value" });

// Extension B: Listen
pi.events.on("myapp:data", (data) => {
  console.log("Received:", data);
});
```

---

## State Patterns

### Caching Pattern

```typescript
const cache = new Map<string, { data: any; expiry: number }>();

function getCached(key: string) {
  const item = cache.get(key);
  if (item && Date.now() < item.expiry) {
    return item.data;
  }
  cache.delete(key);
  return null;
}
```

### State Machine Pattern

```typescript
type State = "idle" | "processing" | "error";

const machine = {
  state: "idle" as State,
  transition(to: State) {
    console.log(`${this.state} → ${to}`);
    this.state = to;
  },
};
```

---

**Next:** Production patterns for complex extensions → [Production](04-production.md)
