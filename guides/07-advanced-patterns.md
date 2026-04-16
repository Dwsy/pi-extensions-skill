# Advanced Patterns

> Provider plugins, OAuth, tool overrides, and safe parallel execution.

---

## Provider Plugins

Pi's `pi.registerProvider()` lets extensions inject new model providers or override existing ones at runtime. This is the canonical way to add proxy support, custom endpoints, or OAuth-based providers.

### Lifecycle

```
extension load
  │
  ├─► pi.registerProvider("name", config)
  │    → queued in pendingProviderRegistrations
  │
  ▼
bindCore() (inside AgentSession constructor)
  │
  ├─► flush queue → modelRegistry.registerProvider()
  │
  ▼
session_start / model_select
  → provider is live and models are selectable
```

### Registration Types

#### 1. New Provider with Models

Requires `baseUrl` + (`apiKey` or `oauth`) + `api` + `models`.

```typescript
pi.registerProvider("my-proxy", {
  baseUrl: "https://proxy.example.com/v1",
  apiKey: "PROXY_API_KEY",  // env var name or literal string
  api: "openai-responses",
  authHeader: true,
  models: [
    {
      id: "claude-sonnet-4-5",
      name: "Claude Sonnet 4.5 (Proxy)",
      reasoning: true,
      input: ["text", "image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 200000,
      maxTokens: 16384,
    },
  ],
});
```

#### 2. Override Existing Provider URL

Only `baseUrl` and optionally `headers`:

```typescript
pi.registerProvider("anthropic", {
  baseUrl: "https://proxy.example.com",
  headers: { "X-Custom-Header": "value" },
});
```

#### 3. OAuth Provider

Enables `/login <provider>` support:

```typescript
pi.registerProvider("corporate-ai", {
  baseUrl: "https://ai.corp.com",
  api: "openai-responses",
  models: [...],
  oauth: {
    name: "Corporate AI (SSO)",
    async login(callbacks) {
      callbacks.onAuth({ url: "https://sso.corp.com/..." });
      const code = await callbacks.onPrompt({ message: "Enter code:" });
      return { refresh: code, access: code, expires: Date.now() + 3600000 };
    },
    async refreshToken(credentials) {
      return credentials;
    },
    getApiKey(credentials) {
      return credentials.access;
    },
    modifyModels?(models, credentials) {
      // Optional: mutate model list based on credentials
      return models;
    },
  },
});
```

### Dynamic Model Loading Pattern

From real extensions (e.g., `kilo-pi-provider`), a common pattern is:

1. **Load free/public models at extension startup** so the provider is immediately usable.
2. **Cache full model list after login** in `login()` or `session_start`.
3. **Use `modifyModels`** to swap the model list when credentials exist.
4. **Re-register in `session_start`** if already logged in, to trigger `modifyModels`.

```typescript
let cachedAllModels: ProviderModelConfig[] = [];

export default async function (pi: ExtensionAPI) {
  // 1. Free models at startup
  let freeModels = await fetchFreeModels();

  function makeOAuthConfig() {
    return {
      name: "MyProvider",
      async login(callbacks) {
        const cred = await doOAuthLogin(callbacks);
        cachedAllModels = await fetchAllModels(cred.access);
        return cred;
      },
      refreshToken: async (cred) => cred,
      getApiKey: (cred) => cred.access,
      modifyModels: (models, _cred) => {
        if (cachedAllModels.length === 0) return models;
        // rebuild model list from cache
        return [...models.filter(m => m.provider !== "myprovider"), ...newModels];
      },
    };
  }

  pi.registerProvider("myprovider", {
    baseUrl: "...",
    apiKey: "MY_API_KEY",
    api: "openai-completions",
    models: freeModels,
    oauth: makeOAuthConfig(),
  });

  // 2. Re-apply after session start if already logged in
  pi.on("session_start", async (_event, ctx) => {
    const cred = ctx.modelRegistry.authStorage.get("myprovider");
    if (cred?.type !== "oauth") return;
    cachedAllModels = await fetchAllModels(cred.access);
    ctx.modelRegistry.registerProvider("myprovider", {
      baseUrl: "...",
      models: freeModels,
      oauth: makeOAuthConfig(),
    });
  });
}
```

### Shell-Resolved API Keys

You can use `!` prefix in `apiKey` to run a shell command:

```typescript
pi.registerProvider("qwen", {
  apiKey: "!cat ~/.qwen/token.txt",
  // ...
});
```

**Security:** Never hardcode bearer tokens. Use env vars, shell resolution, or OAuth.

---

## Tool Overrides

Extensions can replace built-in tools by registering a tool with the same name.

### Supported Override Names

- `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`

### Partial Override

You can override only `execute` while inheriting the built-in renderer:

```typescript
pi.registerTool({
  name: "read",
  label: "Read",
  description: "Read with audit logging",
  parameters: Type.Object({ path: Type.String() }),
  async execute(_id, params, signal, onUpdate, ctx) {
    console.log(`[AUDIT] Reading ${params.path}`);
    // Delegate to built-in logic or reimplement
    const text = await readFile(params.path, "utf8");
    return { content: [{ type: "text", text }] };
  },
  // Omit renderCall and renderResult → built-in renderers are used
});
```

### Full Override (with Custom Rendering)

```typescript
pi.registerTool({
  name: "bash",
  label: "Bash",
  description: "Sandboxed bash execution",
  parameters: Type.Object({ command: Type.String() }),
  async execute(_id, params, signal, onUpdate, ctx) {
    // Custom execution logic
    return { content: [{ type: "text", text: "sandbox output" }] };
  },
  renderCall(args, theme) {
    return new Text(theme.fg("accent", `sandbox: ${args.command}`), 0, 0);
  },
  renderResult(result, { expanded }, theme) {
    return new Text(result.content[0]?.text || "", 0, 0);
  },
});
```

### Important: Match Result Shape

If you override `bash`, your `details` must match `BashToolDetails` if any extension or the UI expects it.

---

## File Mutation Queue

Pi executes sibling tool calls in **parallel** by default. Without coordination, two tools can:

1. Read the same old file contents simultaneously
2. Compute different updates
3. Write back — last write wins, losing one change

### The Solution: `withFileMutationQueue()`

```typescript
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import { resolve, dirname } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

pi.registerTool({
  name: "patch_file",
  parameters: Type.Object({
    path: Type.String(),
    oldText: Type.String(),
    newText: Type.String(),
  }),
  async execute(_id, params, _signal, _onUpdate, ctx) {
    const absolutePath = resolve(ctx.cwd, params.path);

    return withFileMutationQueue(absolutePath, async () => {
      await mkdir(dirname(absolutePath), { recursive: true });
      const current = await readFile(absolutePath, "utf8");
      const next = current.replace(params.oldText, params.newText);
      await writeFile(absolutePath, next, "utf8");
      return { content: [{ type: "text", text: "Updated" }] };
    });
  },
});
```

### Key Rules

- Pass the **resolved absolute path** (not raw user input).
- Queue the entire **read-modify-write** window.
- For existing files, the queue canonicalizes via `realpath()`. Symlinks to the same file share one queue.
- For new files, it falls back to the resolved absolute path.

---

## Remote Execution via Operations

Built-in tools support pluggable backends. Extensions can delegate `read`, `bash`, `edit`, `write` to remote systems.

### Bash Remote Example

```typescript
import { createBashTool, createLocalBashOperations } from "@mariozechner/pi-coding-agent";

pi.registerTool({
  ...createBashTool(cwd),
  async execute(id, params, signal, onUpdate, ctx) {
    const ssh = getSshConfig();
    if (ssh) {
      const tool = createBashTool(cwd, {
        operations: {
          exec(command, cwd, options) {
            return sshExec(ssh, command);
          },
        },
      });
      return tool.execute(id, params, signal, onUpdate);
    }
    // Fallback to local
    const local = createBashTool(cwd);
    return local.execute(id, params, signal, onUpdate);
  },
});
```

### Spawn Hook

Adjust command, cwd, or env before local execution:

```typescript
const bashTool = createBashTool(cwd, {
  spawnHook: ({ command, cwd, env }) => ({
    command: `source ~/.profile\n${command}`,
    cwd: `/mnt/sandbox${cwd}`,
    env: { ...env, CI: "1" },
  }),
});
```

### User Bash Override

Intercept `!command` and `!!command`:

```typescript
pi.on("user_bash", (event, ctx) => {
  // Option 1: custom operations
  return { operations: remoteBashOps };

  // Option 2: wrap local operations
  const local = createLocalBashOperations();
  return {
    operations: {
      exec(command, cwd, options) {
        return local.exec(`source ~/.profile\n${command}`, cwd, options);
      },
    },
  };

  // Option 3: full replacement
  return {
    result: { output: "...", exitCode: 0, cancelled: false, truncated: false },
  };
});
```

---

## Provider Context Rewriting

Some providers require message rewriting before sending to the LLM. Use the `context` event:

```typescript
pi.on("context", async (event, ctx) => {
  const model = ctx.model;
  if (!model || model.provider !== "qwen-oauth") return;

  // Example: coerce developer role to system
  const rewritten = event.messages.map((m) => {
    if ((m as any).role === "developer") {
      return { ...(m as any), role: "system" };
    }
    return m;
  });

  return { messages: rewritten as any };
});
```

---

## Custom Streaming APIs

For non-standard APIs, provide `streamSimple`:

```typescript
pi.registerProvider("custom", {
  baseUrl: "https://api.custom.com",
  api: "openai-responses",
  models: [...],
  streamSimple: (model, context, options) => {
    // Return an async iterable of AssistantMessageEventStream
    return customStreamImplementation(model, context, options);
  },
});
```

See `docs/custom-provider.md` in pi source for advanced streaming internals.

---

*Back to [SKILL.md](../SKILL.md)*
