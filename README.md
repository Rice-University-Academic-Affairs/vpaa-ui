# VPAA UI

Svelte 5 component library for VPAA admin apps. Includes layout, tables, metrics, and a built-in AI chat assistant.

```sh
npm install
npm run dev
```

Open the app and click the sparkles icon to try chat.

---

## AI Chat

A full-stack SvelteKit app wires up three things:

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

Defaults work out of the box for local development: `localStorage` storage and `/api/chat` endpoint.

---

## 1. Storage (threads + messages)

Implement `ChatStorage` to persist threads and message history in your own database. The chat UI calls these methods automatically.

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
// src/lib/chat/storage.ts
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

Use `createLocalChatStorage()` for prototyping and `createMemoryChatStorage()` in tests.

---

## 2. Client session + client tools

```ts
// src/lib/chat/client-tools.ts
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
// src/lib/chat/session.ts
import { createAiChatSession } from "vpaa-ui";
import { chatClientTools } from "./client-tools.js";
import { chatStorage } from "./storage.js";

export const chat = createAiChatSession({
  storage: chatStorage,
  chat: "/api/chat",
  clientTools: chatClientTools
});
```

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { AppShell } from "vpaa-ui";
  import { chat } from "$lib/chat/session.js";
</script>

<AppShell appName="My App" {navigation} {chat}>
  {@render children()}
</AppShell>
```

Client tools run in the browser. Register them with `clientTools` on the session — the client advertises them to the server on every request automatically.

---

## 3. Server route handler + server tools + LLM

### LLM adapter

Install a TanStack AI provider package. The **adapter** is the object that connects to your model (OpenAI, Anthropic, etc.):

```sh
npm install @tanstack/ai-openai
```

```ts
// src/routes/api/chat/adapter.ts
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

`createChatRouteHandler` merges `serverTools` with the session's `clientTools` into `allTools` for the agent. You don't merge them yourself.

### Mock agent (no LLM)

For demos or tests without a live model, pass `createStream` instead of `adapter`:

```ts
export const POST = createChatRouteHandler({
  serverTools,
  createStream: (context) => myMockStream(context)
});
```

The showcase uses this pattern — see `src/routes/api/chat/+server.ts`.

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
| `selectedThread` | Active thread metadata |
| `chat` | Active conversation (`messages`, `isLoading`, `sendMessage`, etc.) |
| `selectThread(id)` | Switch threads |
| `createThread()` | Start a new thread |
| `deleteThread(id)` | Remove a thread |
| `dispose()` | Clean up (call on unmount if not using `AppShell`) |

---

## Without AppShell

```svelte
<script>
  import { AiChat, createAiChatSession } from "vpaa-ui";
  const session = createAiChatSession();
</script>

<AiChat {session} />
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the showcase app |
| `npm run build` | Build the library |
| `npm run check` | Type-check |
| `npm test` | Run tests |
