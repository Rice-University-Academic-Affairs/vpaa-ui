import type { AnyClientTool } from "@tanstack/ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "@tanstack/ai-client";
import { createMemoryChatStorage } from "../core/storage.js";
import { createMockChatClient, flushAsyncWork } from "../test-utils/mock-chat-client.js";
import { mountSession } from "../test-utils/mount-session.js";

const createdClients: ReturnType<typeof createMockChatClient>[] = [];

const createAiChatMock = vi.fn(
	(options: {
		threadId?: string;
		onFinish?: () => void;
		chat?: string;
		persistence?: unknown;
		tools?: unknown;
	}) => {
	const client = createMockChatClient({
		threadId: options.threadId,
		onFinish: options.onFinish
	});
	createdClients.push(client);
	return client;
});

vi.mock("../client/create-chat.svelte.js", () => ({
	createAiChat: (options: {
		threadId?: string;
		onFinish?: () => void;
		chat?: string;
		persistence?: unknown;
		tools?: unknown;
	}) => createAiChatMock(options)
}));

describe("createAiChatSession", () => {
	beforeEach(() => {
		createdClients.length = 0;
		createAiChatMock.mockClear();
	});

	it("exposes session getters and actions", async () => {
		const storage = createMemoryChatStorage();
		const session = await mountSession({ storage, threadId: "thread-a" });

		expect(session.chat).toBeDefined();
		expect(Array.isArray(session.threads)).toBe(true);
		expect(typeof session.selectThread).toBe("function");
		expect(typeof session.createThread).toBe("function");
		expect(typeof session.deleteThread).toBe("function");
		expect(typeof session.refreshThreads).toBe("function");
		expect(typeof session.dispose).toBe("function");
	});

	it("uses provided storage instead of auto-creating threads when threadId is set", async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" },
			{ id: "thread-b", title: "Beta", updatedAt: "2026-03-02" }
		]);

		const session = await mountSession({ storage, threadId: "thread-a" });

		expect(session.selectedThreadId).toBe("thread-a");
		expect(session.threads.map((thread) => thread.id)).toEqual(["thread-a", "thread-b"]);
		expect(createAiChatMock).toHaveBeenCalledTimes(1);
		expect(createAiChatMock.mock.calls[0]?.[0]?.threadId).toBe("thread-a");
	});

	it("auto-selects the first thread when no threadId is provided", async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" },
			{ id: "thread-b", title: "Beta", updatedAt: "2026-03-02" }
		]);

		const session = await mountSession({ storage });

		expect(session.selectedThreadId).toBe("thread-a");
		expect(createAiChatMock.mock.calls.at(-1)?.[0]?.threadId).toBe("thread-a");
	});

	it("auto-creates a thread when storage is empty and no threadId is provided", async () => {
		const storage = createMemoryChatStorage();
		const session = await mountSession({ storage });

		expect(session.threads).toHaveLength(1);
		expect(session.selectedThreadId).toBe(session.threads[0]?.id);
	});

	it("selectThread disposes the previous chat client", async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" },
			{ id: "thread-b", title: "Beta", updatedAt: "2026-03-02" }
		]);
		const session = await mountSession({ storage, threadId: "thread-a" });
		const firstClient = createdClients[0];

		await session.selectThread("thread-b");
		await flushAsyncWork();

		expect(firstClient?.stop).toHaveBeenCalled();
		expect(firstClient?.dispose).toHaveBeenCalled();
		expect(session.selectedThreadId).toBe("thread-b");
		expect(createAiChatMock).toHaveBeenCalledTimes(2);
	});

	it("selectThread is a no-op when selecting the active thread", async () => {
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		const session = await mountSession({ storage, threadId: "thread-a" });

		await session.selectThread("thread-a");
		await flushAsyncWork();

		expect(createAiChatMock).toHaveBeenCalledTimes(1);
	});

	it("createThread adds a thread and selects it", async () => {
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		const session = await mountSession({ storage, threadId: "thread-a" });

		const created = await session.createThread({ title: "Gamma" });
		await flushAsyncWork();

		expect(created.title).toBe("Gamma");
		expect(session.selectedThreadId).toBe(created.id);
		expect(session.threads.map((thread) => thread.title)).toContain("Gamma");
	});

	it("deleteThread removes a non-active thread without changing selection", async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" },
			{ id: "thread-b", title: "Beta", updatedAt: "2026-03-02" }
		]);
		const session = await mountSession({ storage, threadId: "thread-a" });

		await session.deleteThread("thread-b");
		await flushAsyncWork();

		expect(session.selectedThreadId).toBe("thread-a");
		expect(session.threads.map((thread) => thread.id)).toEqual(["thread-a"]);
		expect(await storage.getThread("thread-b")).toBeNull();
	});

	it("deleteThread selects the next thread when deleting the active thread", async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" },
			{ id: "thread-b", title: "Beta", updatedAt: "2026-03-02" }
		]);
		const session = await mountSession({ storage, threadId: "thread-a" });

		await session.deleteThread("thread-a");
		await flushAsyncWork();

		expect(session.selectedThreadId).toBe("thread-b");
		expect(session.threads.map((thread) => thread.id)).toEqual(["thread-b"]);
	});

	it("deleteThread clears selection and creates a fresh chat when deleting the last thread", async () => {
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		const session = await mountSession({ storage, threadId: "thread-a" });
		const activeClient = createdClients[0];

		await session.deleteThread("thread-a");
		await flushAsyncWork();

		expect(session.selectedThreadId).toBeNull();
		expect(session.threads).toHaveLength(0);
		expect(activeClient?.stop).toHaveBeenCalled();
		expect(activeClient?.dispose).toHaveBeenCalled();
		expect(createAiChatMock.mock.calls.at(-1)?.[0]?.threadId).toBeUndefined();
	});

	it("syncs metadata from the finishing client messages via onFinish", async () => {
		const storage = createMemoryChatStorage();
		const session = await mountSession({ storage, threadId: "thread-a" });
		const client = createdClients[0];
		const messages: UIMessage[] = [
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", content: "Budget question" }]
			},
			{
				id: "assistant-1",
				role: "assistant",
				parts: [{ type: "text", content: "Budget increased 2%." }]
			}
		];

		client!.messages = messages;
		client!.triggerFinish();
		await flushAsyncWork();

		const thread = await storage.getThread("thread-a");
		expect(thread).toMatchObject({
			id: "thread-a",
			title: "Budget question",
			preview: "Budget increased 2%."
		});
		expect(session.threads.find((entry) => entry.id === "thread-a")).toMatchObject({
			title: "Budget question",
			preview: "Budget increased 2%."
		});
	});

	it("does not apply stale client messages to the currently selected thread", async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" },
			{ id: "thread-b", title: "Beta", updatedAt: "2026-03-02" }
		]);
		const session = await mountSession({ storage, threadId: "thread-a" });
		const firstClient = createdClients[0];

		await session.selectThread("thread-b");
		await flushAsyncWork();

		const activeClient = createdClients[1];
		activeClient!.messages = [
			{
				id: "current-user",
				role: "user",
				parts: [{ type: "text", content: "Current thread message" }]
			}
		];

		firstClient!.messages = [
			{
				id: "stale-user",
				role: "user",
				parts: [{ type: "text", content: "Stale thread message" }]
			},
			{
				id: "stale-assistant",
				role: "assistant",
				parts: [{ type: "text", content: "Stale preview text" }]
			}
		];
		firstClient!.triggerFinish();
		await flushAsyncWork();

		expect(await storage.getThread("thread-a")).toMatchObject({
			preview: "Stale preview text"
		});
		expect(await storage.getThread("thread-b")).toMatchObject({
			title: "Beta"
		});
		expect((await storage.getThread("thread-b"))?.preview).not.toBe("Stale preview text");
	});

	it("dispose stops and disposes the active chat client", async () => {
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		const session = await mountSession({ storage, threadId: "thread-a" });
		const client = createdClients[0];

		session.dispose();

		expect(client?.stop).toHaveBeenCalled();
		expect(client?.dispose).toHaveBeenCalled();
	});

	it("defaults chat to /api/chat", async () => {
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		await mountSession({ storage, threadId: "thread-a" });

		expect(createAiChatMock.mock.calls[0]?.[0]).toEqual(
			expect.objectContaining({
				chat: "/api/chat"
			})
		);
	});

	it("bridges memory storage to message persistence", async () => {
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		await mountSession({ storage, threadId: "thread-a", chat: "/api/chat" });

		expect(createAiChatMock.mock.calls[0]?.[0]?.persistence).toEqual({
			getItem: expect.any(Function),
			setItem: expect.any(Function),
			removeItem: expect.any(Function)
		});
	});

	it("forwards client tools to createAiChat", async () => {
		const clientToolsList = [{ name: "scroll_to_top" }] as unknown as readonly AnyClientTool[];
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		await mountSession({ storage, threadId: "thread-a", clientTools: clientToolsList });

		expect(createAiChatMock.mock.calls[0]?.[0]?.tools).toBe(clientToolsList);
	});

	it("refreshThreads reloads thread metadata from storage", async () => {
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		const session = await mountSession({ storage, threadId: "thread-a" });

		await storage.updateThread("thread-a", { title: "Renamed" });
		await session.refreshThreads();
		await flushAsyncWork();

		expect(session.threads.find((thread) => thread.id === "thread-a")?.title).toBe("Renamed");
	});
});
