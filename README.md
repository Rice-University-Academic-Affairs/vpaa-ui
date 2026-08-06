# VPAA UI

Svelte 5 component library for VPAA admin apps: layout shell, data tables, metrics, and a built-in AI chat assistant.

## Run the showcase

```sh
git clone https://github.com/Rice-University-Academic-Affairs/vpaa-ui.git
cd vpaa-ui
npm install
npm run dev
```

Open the app and click the sparkles icon to try chat. See `src/routes/+page.svelte` for table and metric examples.

## Use in your SvelteKit app

```sh
npm install vpaa-ui
```

Peer dependencies: `svelte ^5`, `tailwindcss ^4`, `@lucide/svelte ^1`.

Import the theme in your root layout CSS:

```css
@import "vpaa-ui/theme.css";
```

---

## AI Chat

A SvelteKit app wires up three pieces:

| Piece | Where | What it does |
|---|---|---|
| **Storage** | Client | Threads + message history (sidebar + persistence) |
| **Session** | Client | Chat UI, client tools, talks to your API |
| **Route handler** | Server | LLM agent, server tools, SSE responses |

```
Browser                              Your SvelteKit API
────────                             ──────────────────
createAiChatSession  ──POST /api/chat──►  createChatRouteHandler
  storage (threads)                         adapter (OpenAI, etc.)
  clientTools                               serverTools
```

Defaults work for local development: `createLocalChatStorage()` and the `/api/chat` endpoint (`DEFAULT_CHAT_ENDPOINT`).

The `chat` option on `createAiChatSession` is the API endpoint URL. `session.chat` is the live client (`messages`, `sendMessage`, `isLoading`, etc.).

---

## 1. Storage (optional for prototyping)

Skip custom storage to use `createLocalChatStorage()` automatically. Implement `ChatStorage` when you want your own database.

| Method | Purpose |
|---|---|
| `listThreads` | Sidebar thread list |
| `getThread` | One thread's metadata |
| `createThread` | New thread |
| `updateThread` | Title, preview, etc. |
| `deleteThread` | Remove a thread |
| `getMessages` | Message history for a thread |
| `saveMessages` | Save message history |
| `deleteMessages` | Clear message history |

```ts
// In your app, e.g. src/lib/chat/storage.ts
import type { ChatStorage } from "vpaa-ui";

export const chatStorage: ChatStorage = {
  listThreads: () => fetch("/api/threads").then((r) => r.json()),
  getThread: (id) => fetch(`/api/threads/${id}`).then((r) => r.json()),
  createThread: (input) =>
    fetch("/api/threads", { method: "POST", body: JSON.stringify(input) }).then((r) => r.json()),
  updateThread: (id, patch) =>
    fetch(`/api/threads/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteThread: (id) => fetch(`/api/threads/${id}`, { method: "DELETE" }),
  getMessages: (id) => fetch(`/api/threads/${id}/messages`).then((r) => r.json()),
  saveMessages: (id, messages) =>
    fetch(`/api/threads/${id}/messages`, {
      method: "PUT",
      body: JSON.stringify({ messages })
    }),
  deleteMessages: (id) => fetch(`/api/threads/${id}/messages`, { method: "DELETE" })
};
```

Use `createMemoryChatStorage()` in tests.

---

## 2. Client session + client tools

```ts
// In your app, e.g. src/lib/chat/client-tools.ts
import { clientTools, toolDefinition } from "vpaa-ui";

export const highlightRow = toolDefinition({
  name: "highlight_row",
  description: "Highlight a table row by id",
  inputSchema: {
    type: "object",
    properties: { rowId: { type: "string" } },
    required: ["rowId"]
  },
  outputSchema: {
    type: "object",
    properties: { highlighted: { type: "boolean" } },
    required: ["highlighted"]
  }
}).client(({ rowId }) => {
  document.getElementById(rowId)?.classList.add("highlight");
  return { highlighted: true };
});

export const chatClientTools = clientTools(highlightRow);
```

```ts
// In your app, e.g. src/lib/chat/session.ts
import { createAiChatSession, DEFAULT_CHAT_ENDPOINT } from "vpaa-ui";
import { chatClientTools } from "./client-tools.js";
import { chatStorage } from "./storage.js";

export const chatSession = createAiChatSession({
  storage: chatStorage,
  chat: DEFAULT_CHAT_ENDPOINT,
  clientTools: chatClientTools
});
```

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { page } from "$app/state";
  import { AppShell, type AppNavGroup } from "vpaa-ui";
  import { chatSession } from "$lib/chat/session.js";
  import "vpaa-ui/theme.css";

  let { children } = $props();

  const navigation: AppNavGroup[] = [
    { items: [{ label: "Home", href: "/", exact: true }] }
  ];
</script>

<AppShell
  appName="My App"
  {navigation}
  currentPath={page.url.pathname}
  chat={chatSession}
>
  {@render children()}
</AppShell>
```

Client tools run in the browser. Register them with `clientTools` on the session — the client advertises them to the server on every request automatically.

---

## 3. Server route handler + server tools + LLM

### Environment

```sh
# .env
OPENAI_API_KEY=sk-...
```

### LLM adapter

```sh
npm install @tanstack/ai-openai
```

```ts
// In your app's +server.ts or a shared module
import { openaiText } from "@tanstack/ai-openai";
import { OPENAI_API_KEY } from "$env/static/private";

export const adapter = openaiText("gpt-4o", {
  apiKey: OPENAI_API_KEY
});
```

### Server tools

```ts
// src/routes/api/chat/tools.ts
import { toolDefinition } from "@tanstack/ai";

const getHeadcount = toolDefinition({
  name: "get_headcount",
  description: "Return current faculty headcount",
  inputSchema: { type: "object", properties: {} },
  outputSchema: {
    type: "object",
    properties: { count: { type: "number" } },
    required: ["count"]
  }
});

export const serverTools = [
  getHeadcount.server(async () => {
    const count = await db.faculty.count();
    return { count };
  })
];
```

### Route handler

```ts
// src/routes/api/chat/+server.ts
import { createChatRouteHandler } from "vpaa-ui";
import { adapter } from "./adapter.js";
import { serverTools } from "./tools.js";

export const POST = createChatRouteHandler({
  serverTools,
  adapter
});
```

`createChatRouteHandler` merges `serverTools` with the session's `clientTools` before calling the agent. You don't merge them yourself.

### Mock agent (no LLM)

For demos or tests without a live model, pass `createStream` instead of `adapter`:

```ts
export const POST = createChatRouteHandler({
  serverTools,
  createStream: (context) => myMockStream(context)
});
```

The showcase uses `createMockChatStream` — see `src/routes/api/chat/+server.ts` and `mock-stream.ts`.

---

## Tool summary

| | Client tool | Server tool |
|---|---|---|
| Define | `toolDefinition(...).client(fn)` | `toolDefinition(...).server(fn)` |
| Register | `clientTools: clientTools(...)` on session | `serverTools: [...]` on route handler |
| Runs in | Browser | Your server |

---

## Session API

| Member | Description |
|---|---|
| `threads` | Thread list for the sidebar |
| `selectedThreadId` | Active thread id |
| `selectedThread` | Active thread metadata |
| `chat` | Active conversation client |
| `selectThread(id)` | Switch threads |
| `createThread()` | Start a new thread |
| `deleteThread(id)` | Remove a thread |
| `refreshThreads()` | Reload thread metadata from storage |
| `dispose()` | Clean up (call on unmount if not using `AppShell`) |

`session.chat` is available immediately when the session is created. Thread metadata finishes loading during bootstrap.

Optional `threadId` pre-selects a thread that already exists in storage.

---

## Without AppShell

```svelte
<script>
  import { AiChat, createAiChatSession } from "vpaa-ui";
  const session = createAiChatSession();
</script>

<AiChat {session} />
```

Composable subcomponents are also exported: `AiChatPanel`, `AiChatView`, `AiChatThreadList`, `AiChatInput`, `AiChatTrigger`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the showcase app |
| `npm run build` | Build the showcase app and library package |
| `npm run check` | Type-check |
| `npm test` | Run unit and integration tests |
| `npm run test:coverage` | Run tests with coverage thresholds |
| `npm run test:e2e` | Run Playwright browser tests |
