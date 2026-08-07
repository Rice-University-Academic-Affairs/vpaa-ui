import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "@tanstack/ai-client";
import { createMemoryChatStorage } from "../core/storage.js";
import { createMockChatClient } from "../test-utils/mock-chat-client.js";
import { ChatSessionController } from "./session-controller.js";

const createdClients: ReturnType<typeof createMockChatClient>[] = [];

describe("ChatSessionController", () => {
	beforeEach(() => {
		createdClients.length = 0;
	});

	function createController(storage = createMemoryChatStorage(), threadId: string | null = null) {
		return new ChatSessionController({
			storage,
			chat: "/api/chat",
			threadId,
			createChat: (id, onFinish) => {
				const client = createMockChatClient({
					threadId: id ?? undefined,
					onFinish: () => onFinish(client.messages)
				});
				createdClients.push(client);
				return client;
			}
		});
	}

	it("selectThread disposes the previous chat client", async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" },
			{ id: "thread-b", title: "Beta", updatedAt: "2026-03-02" }
		]);
		const controller = createController(storage, "thread-a");
		const firstClient = createdClients[0];

		await controller.selectThread("thread-b");

		expect(firstClient?.stop).toHaveBeenCalled();
		expect(firstClient?.dispose).toHaveBeenCalled();
		expect(controller.selectedThreadId).toBe("thread-b");
	});

	it("bootstraps by selecting the first thread when none is selected", async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }
		]);
		const controller = createController(storage);

		await controller.bootstrap();

		expect(controller.selectedThreadId).toBe("thread-a");
	});

	it("syncs metadata from the finishing client messages", async () => {
		const storage = createMemoryChatStorage();
		const controller = createController(storage, "thread-a");
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
		await controller.syncThreadMetadata("thread-a", messages);

		expect(await storage.getThread("thread-a")).toMatchObject({
			title: "Budget question",
			preview: "Budget increased 2%."
		});
	});

	it("does not resurrect a deleted thread from stale metadata sync", async () => {
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		const controller = createController(storage, "thread-a");

		await controller.deleteThread("thread-a");

		await controller.syncThreadMetadata("thread-a", [
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", content: "Stale message" }]
			},
			{
				id: "assistant-1",
				role: "assistant",
				parts: [{ type: "text", content: "Stale preview" }]
			}
		]);

		expect(await storage.getThread("thread-a")).toBeNull();
	});

	it("creates a replacement thread when deleting the last thread", async () => {
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		const controller = createController(storage, "thread-a");

		await controller.deleteThread("thread-a");

		expect(controller.selectedThreadId).not.toBeNull();
		expect(controller.selectedThreadId).not.toBe("thread-a");
		expect(controller.threads).toHaveLength(1);
	});

	it("selects an existing thread when bootstrap receives an invalid threadId", async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" },
			{ id: "thread-b", title: "Beta", updatedAt: "2026-03-02" }
		]);
		const controller = createController(storage, "missing-thread");

		await controller.bootstrap();

		expect(controller.selectedThreadId).toBe("thread-a");
		expect(controller.selectedThread).toMatchObject({ id: "thread-a" });
	});

	it("ignores selectThread for an unknown thread id", async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }
		]);
		const controller = createController(storage, "thread-a");
		const firstClient = createdClients[0];

		await controller.selectThread("missing-thread");

		expect(controller.selectedThreadId).toBe("thread-a");
		expect(firstClient?.stop).not.toHaveBeenCalled();
		expect(firstClient?.dispose).not.toHaveBeenCalled();
		expect(createdClients).toHaveLength(1);
	});

	it("dispose is idempotent", async () => {
		const controller = createController(createMemoryChatStorage(), "thread-a");
		const client = createdClients[0];

		controller.dispose();
		controller.dispose();

		expect(client?.stop).toHaveBeenCalledTimes(1);
		expect(client?.dispose).toHaveBeenCalledTimes(1);
	});

	it("allows metadata sync after recreating a deleted thread with the same id", async () => {
		const storage = createMemoryChatStorage([{ id: "thread-a", title: "Alpha", updatedAt: "2026-03-03" }]);
		const controller = createController(storage, "thread-a");

		await controller.deleteThread("thread-a");
		await controller.createThread({ id: "thread-a", title: "Alpha again" });

		await controller.syncThreadMetadata("thread-a", [
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", content: "Fresh start" }]
			},
			{
				id: "assistant-1",
				role: "assistant",
				parts: [{ type: "text", content: "Fresh preview" }]
			}
		]);

		expect(await storage.getThread("thread-a")).toMatchObject({
			title: "Alpha again",
			preview: "Fresh preview"
		});
	});
});
