import type { UIMessage } from "@tanstack/ai-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	canUseLocalChatStorage,
	createLocalChatStorage,
	createMemoryChatStorage,
	toMessagePersistence
} from "./storage.js";

const sampleMessages: UIMessage[] = [
	{
		id: "m1",
		role: "user",
		parts: [{ type: "text", content: "Hello" }]
	}
];

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

	it("stores and retrieves message history per thread", async () => {
		const storage = createMemoryChatStorage();
		const thread = await storage.createThread({ title: "Chat" });

		await storage.saveMessages(thread.id, sampleMessages);
		expect(await storage.getMessages(thread.id)).toEqual(sampleMessages);
	});

	it("removes message history independently", async () => {
		const storage = createMemoryChatStorage();
		const thread = await storage.createThread({ title: "Chat" });

		await storage.saveMessages(thread.id, sampleMessages);
		await storage.deleteMessages(thread.id);

		expect(await storage.getMessages(thread.id)).toBeNull();
		expect(await storage.getThread(thread.id)).not.toBeNull();
	});

	it("returns null for unknown threads", async () => {
		const storage = createMemoryChatStorage();
		expect(await storage.getThread("missing")).toBeNull();
	});

	it("deletes thread metadata and message history together", async () => {
		const storage = createMemoryChatStorage();
		const thread = await storage.createThread({ title: "Chat" });

		await storage.saveMessages(thread.id, sampleMessages);
		await storage.deleteThread(thread.id);

		expect(await storage.getThread(thread.id)).toBeNull();
		expect(await storage.getMessages(thread.id)).toBeNull();
	});
});

describe("toMessagePersistence", () => {
	it("bridges storage to TanStack AI persistence", async () => {
		const storage = createMemoryChatStorage();
		const thread = await storage.createThread({ title: "Chat" });
		const persistence = toMessagePersistence(storage);

		await persistence.setItem(thread.id, { messages: sampleMessages });
		expect(await persistence.getItem(thread.id)).toEqual({ messages: sampleMessages });

		await persistence.removeItem(thread.id);
		expect(await persistence.getItem(thread.id)).toBeNull();
	});
});

describe("canUseLocalChatStorage", () => {
	it("returns false when localStorage is unavailable", () => {
		vi.stubGlobal("localStorage", undefined);
		expect(canUseLocalChatStorage()).toBe(false);
		vi.unstubAllGlobals();
	});

	it("returns true when localStorage is available", () => {
		expect(canUseLocalChatStorage()).toBe(true);
	});

	it("returns false when localStorage writes fail", () => {
		vi.stubGlobal("localStorage", {
			setItem: () => {
				throw new Error("quota exceeded");
			},
			removeItem: () => {}
		});

		expect(canUseLocalChatStorage()).toBe(false);
		vi.unstubAllGlobals();
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

	it("does not overwrite existing local storage when initialThreads is provided", async () => {
		store.set(
			"test:threads",
			JSON.stringify([{ id: "existing", title: "Existing", updatedAt: "2026-03-10" }])
		);

		const storage = createLocalChatStorage({
			keyPrefix: "test:",
			initialThreads: [{ id: "seed", title: "Seed", updatedAt: "2026-01-01" }]
		});

		expect(await storage.listThreads()).toEqual([
			{ id: "existing", title: "Existing", updatedAt: "2026-03-10" }
		]);
	});

	it("persists thread metadata and message history", async () => {
		const storage = createLocalChatStorage({ keyPrefix: "test:" });
		const thread = await storage.createThread({ title: "Local chat" });

		await storage.saveMessages(thread.id, sampleMessages);

		const reopened = createLocalChatStorage({ keyPrefix: "test:" });
		expect(await reopened.getThread(thread.id)).toMatchObject({ title: "Local chat" });
		expect(await reopened.getMessages(thread.id)).toEqual(sampleMessages);
	});

	it("deletes thread metadata and message history together", async () => {
		const storage = createLocalChatStorage({ keyPrefix: "test:" });
		const thread = await storage.createThread({ title: "Temporary" });

		await storage.saveMessages(thread.id, sampleMessages);
		await storage.deleteThread(thread.id);

		expect(await storage.getThread(thread.id)).toBeNull();
		expect(await storage.getMessages(thread.id)).toBeNull();
	});
});
