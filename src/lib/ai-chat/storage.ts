import { localStoragePersistence } from "@tanstack/ai-client";
import type { ChatClientPersistence, ChatPersistedState } from "@tanstack/ai-client";
import type { AiChatThread } from "$lib/types/chat.js";

export type ChatThreadRecord = AiChatThread;

export type CreateChatThreadInput = {
	id?: string;
	title?: string;
	preview?: string;
	updatedAt?: string;
};

export type UpdateChatThreadPatch = Partial<Pick<ChatThreadRecord, "title" | "preview" | "updatedAt">>;

export type MaybePromise<T> = T | Promise<T>;

export interface ChatStorage {
	listThreads(): MaybePromise<ChatThreadRecord[]>;
	getThread(id: string): MaybePromise<ChatThreadRecord | null>;
	createThread(input?: CreateChatThreadInput): MaybePromise<ChatThreadRecord>;
	updateThread(id: string, patch: UpdateChatThreadPatch): MaybePromise<void>;
	deleteThread(id: string): MaybePromise<void>;
	getThreadState(threadId: string): MaybePromise<ChatPersistedState | null>;
	setThreadState(threadId: string, state: ChatPersistedState): MaybePromise<void>;
	removeThreadState(threadId: string): MaybePromise<void>;
}

export type LocalChatStorageOptions = {
	keyPrefix?: string;
	initialThreads?: ChatThreadRecord[];
};

export function toMessagePersistence(storage: ChatStorage): ChatClientPersistence {
	return {
		getItem: (threadId) => storage.getThreadState(threadId),
		setItem: (threadId, state) => storage.setThreadState(threadId, state),
		removeItem: (threadId) => storage.removeThreadState(threadId)
	};
}

function sortThreads(threads: Iterable<ChatThreadRecord>): ChatThreadRecord[] {
	return [...threads].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

function readThreadCatalog(key: string): ChatThreadRecord[] {
	if (typeof localStorage === "undefined") return [];

	try {
		const raw = localStorage.getItem(key);
		if (!raw) return [];
		return JSON.parse(raw) as ChatThreadRecord[];
	} catch {
		return [];
	}
}

function writeThreadCatalog(key: string, threads: ChatThreadRecord[]) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(key, JSON.stringify(threads));
}

export function createLocalChatStorage(options: LocalChatStorageOptions = {}): ChatStorage {
	const prefix = options.keyPrefix ?? "vpaa-ui:";
	const threadsKey = `${prefix}threads`;
	const messages = localStoragePersistence({ keyPrefix: `${prefix}messages:` });

	if (readThreadCatalog(threadsKey).length === 0 && options.initialThreads?.length) {
		writeThreadCatalog(threadsKey, options.initialThreads);
	}

	return {
		listThreads: () => sortThreads(readThreadCatalog(threadsKey)),
		getThread: (id) => readThreadCatalog(threadsKey).find((thread) => thread.id === id) ?? null,
		createThread: (input = {}) => {
			const thread: ChatThreadRecord = {
				id: input.id ?? crypto.randomUUID(),
				title: input.title ?? "New chat",
				preview: input.preview,
				updatedAt: input.updatedAt ?? new Date().toISOString()
			};
			const threads = readThreadCatalog(threadsKey);
			threads.push(thread);
			writeThreadCatalog(threadsKey, threads);
			return thread;
		},
		updateThread: (id, patch) => {
			const threads = readThreadCatalog(threadsKey);
			const index = threads.findIndex((thread) => thread.id === id);
			if (index === -1) return;
			threads[index] = { ...threads[index], ...patch };
			writeThreadCatalog(threadsKey, threads);
		},
		deleteThread: async (id) => {
			writeThreadCatalog(
				threadsKey,
				readThreadCatalog(threadsKey).filter((thread) => thread.id !== id)
			);
			await messages.removeItem(id);
		},
		getThreadState: async (threadId) => (await messages.getItem(threadId)) ?? null,
		setThreadState: (threadId, state) => messages.setItem(threadId, state),
		removeThreadState: (threadId) => messages.removeItem(threadId)
	};
}

export function createMemoryChatStorage(
	initialThreads: ChatThreadRecord[] = []
): ChatStorage {
	const threads = new Map(initialThreads.map((thread) => [thread.id, { ...thread }]));
	const states = new Map<string, ChatPersistedState>();

	return {
		listThreads: () => sortThreads(threads.values()),
		getThread: (id) => threads.get(id) ?? null,
		createThread: (input = {}) => {
			const thread: ChatThreadRecord = {
				id: input.id ?? crypto.randomUUID(),
				title: input.title ?? "New chat",
				preview: input.preview,
				updatedAt: input.updatedAt ?? new Date().toISOString()
			};
			threads.set(thread.id, thread);
			return thread;
		},
		updateThread: (id, patch) => {
			const existing = threads.get(id);
			if (!existing) return;
			threads.set(id, { ...existing, ...patch });
		},
		deleteThread: (id) => {
			threads.delete(id);
			states.delete(id);
		},
		getThreadState: (threadId) => states.get(threadId) ?? null,
		setThreadState: (threadId, state) => {
			states.set(threadId, structuredClone(state));
		},
		removeThreadState: (threadId) => {
			states.delete(threadId);
		}
	};
}

export const createMemoryThreadStorage = createMemoryChatStorage;

export type ChatThreadStorage = ChatStorage;
