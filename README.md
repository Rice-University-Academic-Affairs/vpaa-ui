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
  storage (threads)                         llmAdapter (OpenAI, etc.)
  client tools                              server tools
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

## 2. Client session

Create the session once and pass it to `AppShell` (or `AiChat` directly).

```ts
// src/lib/chat/session.ts
import {
  clientTools,
  createAiChatSession,
  createLocalChatStorage,
  toolDefinition
} from "vpaa-ui";
import { chatStorage } from "./storage.js";

const highlightRow = toolDefinition({
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

export const chat = createAiChatSession({
  storage: chatStorage,
  chat: "/api/chat",
  tools: clientTools(highlightRow)
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

### Client tools

Client tools run in the browser. Define with `toolDefinition(...).client(fn)`, then register with `clientTools(...)` on the session. The client advertises them to the server on every request — you don't send them manually.

---

## 3. Server route handler

Export a SvelteKit `POST` handler with `createChatRouteHandler`. It handles AG-UI request parsing, merging client + server tools, and SSE responses.

### Connect your LLM provider

Install a TanStack AI provider package and create an **LLM adapter** — the object that tells TanStack which model to call:

```sh
npm install @tanstack/ai-openai
```

```ts
// src/routes/api/chat/llm.ts
import { openaiText } from "@tanstack/ai-openai";
import { OPENAI_API_KEY } from "$env/static/private";

export const llmAdapter = openaiText("gpt-4o", {
  apiKey: OPENAI_API_KEY
});
```

Other providers work the same way (`@tanstack/ai-anthropic`, etc.). See [TanStack AI docs](https://tanstack.com/ai).

### Define server tools

Server tools run on your machine. Same `toolDefinition` as the client, but use `.server(fn)`:

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

### Export the route

```ts
// src/routes/api/chat/+server.ts
import { createChatRouteHandler } from "vpaa-ui";
import { llmAdapter } from "./llm.js";
import { serverTools } from "./tools.js";

export const POST = createChatRouteHandler({
  tools: serverTools,
  llmAdapter
});
```

That's the full server integration. `llmAdapter` is the LLM (the brain). `serverTools` are capabilities it can invoke. Client tools from the browser are merged in automatically.

### Mock agent (no LLM)

For demos or tests without a live model, pass `createStream` instead of `llmAdapter`:

```ts
export const POST = createChatRouteHandler({
  tools: serverTools,
  createStream: (context) => myMockStream(context)
});
```

The showcase in this repo uses this pattern — see `src/routes/api/chat/+server.ts`.

---

## Tool summary

| | Client tool | Server tool |
|---|---|---|
| Define | `toolDefinition(...).client(fn)` | `toolDefinition(...).server(fn)` |
| Register | `tools: clientTools(...)` on session | `tools: serverTools` on route handler |
| Runs in | Browser | Your server |
| Example | Scroll page, highlight row | Query database, call internal API |

Both sides use the same `toolDefinition` shape. TanStack handles the wire protocol.

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
