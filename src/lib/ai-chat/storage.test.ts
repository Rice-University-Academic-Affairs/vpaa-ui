import type { ChatPersistedState } from "@tanstack/ai-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createLocalChatStorage,
	createMemoryChatStorage,
	createMemoryThreadStorage,
	toMessagePersistence
} from "./storage.js";

const sampleState: ChatPersistedState = {
	messages: [
		{
			id: "m1",
			role: "user",
			parts: [{ type: "text", content: "Hello" }]
		}
	]
};

describe("createMemoryChatStorage", () => {
	it("creates and lists threads by updatedAt descending", async () => {
		const storage = createMemoryChatStorage([
			{ id: "older", title: "Older", updatedAt: "2026-01-01" },
			{ id: "newer", title: "Newer", updatedAt: "2026-03-01" }
		]);

		const threads = await storage.listThreads();
		expect(threads.map((thread) => thread.id)).toEqual(["newer", "older"]);
	});

	it("creates threads with defaults", async () => {
		const storage = createMemoryChatStorage();
		const thread = await storage.createThread({ title: "Budget review" });

		expect(thread.title).toBe("Budget review");
		expect(thread.updatedAt).toBeTruthy();
		expect(await storage.getThread(thread.id)).toEqual(thread);
	});

	it("updates thread metadata", async () => {
		const storage = createMemoryChatStorage();
		const thread = await storage.createThread({ title: "Draft" });

		await storage.updateThread(thread.id, {
			title: "Final",
			preview: "Looks good"
		});

		expect(await storage.getThread(thread.id)).toMatchObject({
			title: "Final",
			preview: "Looks good"
		});
	});

	it("stores and retrieves message state per thread", async () => {
		const storage = createMemoryChatStorage();
		const thread = await storage.createThread({ title: "Chat" });

		await storage.setThreadState(thread.id, sampleState);
		expect(await storage.getThreadState(thread.id)).toEqual(sampleState);
	});

	it("removes message state independently", async () => {
		const storage = createMemoryChatStorage();
		const thread = await storage.createThread({ title: "Chat" });

		await storage.setThreadState(thread.id, sampleState);
		await storage.removeThreadState(thread.id);

		expect(await storage.getThreadState(thread.id)).toBeNull();
		expect(await storage.getThread(thread.id)).not.toBeNull();
	});

	it("deletes thread metadata and message state together", async () => {
		const storage = createMemoryChatStorage();
		const thread = await storage.createThread({ title: "Chat" });

		await storage.setThreadState(thread.id, sampleState);
		await storage.deleteThread(thread.id);

		expect(await storage.getThread(thread.id)).toBeNull();
		expect(await storage.getThreadState(thread.id)).toBeNull();
	});
});

describe("toMessagePersistence", () => {
	it("bridges storage to TanStack AI persistence", async () => {
		const storage = createMemoryChatStorage();
		const thread = await storage.createThread({ title: "Chat" });
		const persistence = toMessagePersistence(storage);

		await persistence.setItem(thread.id, sampleState);
		expect(await persistence.getItem(thread.id)).toEqual(sampleState);

		await persistence.removeItem(thread.id);
		expect(await persistence.getItem(thread.id)).toBeNull();
	});
});

describe("createLocalChatStorage", () => {
	const store = new Map<string, string>();

	beforeEach(() => {
		store.clear();
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			}
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("seeds initial threads when storage is empty", async () => {
		const storage = createLocalChatStorage({
			keyPrefix: "test:",
			initialThreads: [{ id: "seed", title: "Seed thread", updatedAt: "2026-03-01" }]
		});

		expect(await storage.listThreads()).toEqual([
			{ id: "seed", title: "Seed thread", updatedAt: "2026-03-01" }
		]);
	});

	it("persists thread metadata and message state", async () => {
		const storage = createLocalChatStorage({ keyPrefix: "test:" });
		const thread = await storage.createThread({ title: "Local chat" });

		await storage.setThreadState(thread.id, sampleState);

		const reopened = createLocalChatStorage({ keyPrefix: "test:" });
		expect(await reopened.getThread(thread.id)).toMatchObject({ title: "Local chat" });
		expect(await reopened.getThreadState(thread.id)).toEqual(sampleState);
	});

	it("deletes thread metadata and message state together", async () => {
		const storage = createLocalChatStorage({ keyPrefix: "test:" });
		const thread = await storage.createThread({ title: "Temporary" });

		await storage.setThreadState(thread.id, sampleState);
		await storage.deleteThread(thread.id);

		expect(await storage.getThread(thread.id)).toBeNull();
		expect(await storage.getThreadState(thread.id)).toBeNull();
	});
});

describe("createMemoryThreadStorage", () => {
	it("is an alias for createMemoryChatStorage", () => {
		expect(createMemoryThreadStorage).toBe(createMemoryChatStorage);
	});
});
