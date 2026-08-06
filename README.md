# VPAA UI

Svelte 5 component library for VPAA admin apps. Includes layout, tables, metrics, and a built-in AI chat assistant.

```sh
npm install
npm run dev
```

Open the app and click the sparkles icon to try chat.

---

## AI Chat

Two things to wire up: **storage** (threads + message history) and **chat** (your agent endpoint URL). Pass both to `createAiChatSession`, then hand the session to `AppShell`.

```ts
import { createAiChatSession, createLocalChatStorage } from "vpaa-ui";

const chat = createAiChatSession({
  storage: createLocalChatStorage(),
  chat: "/api/chat"
});
```

```svelte
<AppShell appName="My App" {navigation} {chat}>
  {@render children()}
</AppShell>
```

Defaults work out of the box — `localStorage` for storage, `/api/chat` for chat.

---

## Your chat endpoint

`POST` to your chat URL. The client sends:

```json
{
  "threadId": "abc-123",
  "messages": [
    { "role": "user", "content": "Show me faculty headcount" }
  ]
}
```

Your endpoint returns:

```json
{ "message": "Headcount is up 3% this quarter." }
```

Plain text (`text/plain`) also works, including a streamed body for token-by-token replies.

Example (SvelteKit):

```ts
export const POST = async ({ request }) => {
  const { threadId, messages } = await request.json();
  const message = await myAgent.ask({ threadId, messages });
  return Response.json({ message });
};
```

See `src/routes/api/chat/+server.ts` in this repo for a working mock.

---

## Your storage backend

Implement `ChatStorage` to use your own database instead of `localStorage`:

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
const storage: ChatStorage = {
  listThreads: () => api.get("/threads"),
  getThread: (id) => api.get(`/threads/${id}`),
  createThread: (input) => api.post("/threads", input),
  updateThread: (id, patch) => api.patch(`/threads/${id}`, patch),
  deleteThread: (id) => api.delete(`/threads/${id}`),
  getMessages: (id) => api.get(`/threads/${id}/messages`),
  saveMessages: (id, messages) => api.put(`/threads/${id}/messages`, { messages }),
  deleteMessages: (id) => api.delete(`/threads/${id}/messages`)
};
```

For tests, use `createMemoryChatStorage()`.

---

## Session API

| Member | Description |
|---|---|
| `threads` | Thread list for the sidebar |
| `selectedThread` | Active thread metadata |
| `chat` | Active conversation (messages, loading, errors) |
| `selectThread(id)` | Switch threads |
| `createThread()` | Start a new thread |
| `deleteThread(id)` | Remove a thread |
| `dispose()` | Clean up (call on unmount if not using `AppShell`) |

---

## Client tools

```ts
import { clientTools, createAiChatSession, toolDefinition } from "vpaa-ui";

const scrollToTop = toolDefinition({
  name: "scroll_to_top",
  description: "Scroll the page to the top",
  inputSchema: { type: "object", properties: {} },
  outputSchema: {
    type: "object",
    properties: { scrolled: { type: "boolean" } },
    required: ["scrolled"]
  }
}).client(() => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  return { scrolled: true };
});

const chat = createAiChatSession({
  tools: clientTools(scrollToTop)
});
```

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
