# VPAA UI

Svelte 5 component library for VPAA admin apps. Includes layout, tables, metrics, and a built-in AI chat assistant.

Run the showcase:

```sh
npm install
npm run dev
```

Open the app and click the sparkles icon to try chat.

---

## AI Chat

One entry point: `createAiChatSession`. It manages threads, persistence, and the active conversation. Pass the session to `AppShell` and you're done.

### 1. Create a session

```ts
import { createAiChatSession, createLocalChatStorage } from "vpaa-ui";

const chat = createAiChatSession({
  storage: createLocalChatStorage(),
  transport: "/api/chat"
});
```

Defaults work out of the box — storage falls back to `localStorage`, transport falls back to `/api/chat`.

### 2. Pass it to AppShell

```svelte
<script lang="ts">
  import { AppShell } from "vpaa-ui";

  const chat = createAiChatSession();
</script>

<AppShell appName="My App" {navigation} {chat}>
  {@render children()}
</AppShell>
```

`AppShell` renders the chat drawer, thread list, and input. It calls `chat.dispose()` on teardown.

### 3. Add a chat API route

The client POSTs to your transport URL (default `/api/chat`) and expects a server-sent events stream. See `src/routes/api/chat/+server.ts` in this repo for a working mock handler you can copy.

To let the server own message persistence instead:

```ts
createAiChatSession({
  transport: { mode: "server", endpoint: "/api/chat" }
});
```

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

Let the assistant trigger browser actions. Define a tool, wrap it with `.client()`, and pass it to the session:

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

## Custom storage

Implement `ChatStorage` if you need server-backed threads or messages. The interface covers thread metadata (`listThreads`, `createThread`, …) and per-thread message state (`getThreadState`, `setThreadState`, …).

For tests, use `createMemoryChatStorage()` instead of `createLocalChatStorage()`.

---

## Without AppShell

Use the `AiChat` component if you only need the trigger + panel:

```svelte
<script lang="ts">
  import { AiChat, createAiChatSession } from "vpaa-ui";

  const session = createAiChatSession();
</script>

<AiChat {session} />
```

---

## Other components

`DataTable`, `DrilldownTable`, `MetricCard`, `PageContainer`, and more are exported from `vpaa-ui`. Browse the showcase page (`src/routes/+page.svelte`) for examples.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the showcase app |
| `npm run build` | Build the library |
| `npm run check` | Type-check |
| `npm test` | Run tests |
