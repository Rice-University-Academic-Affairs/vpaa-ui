import type { UIMessage } from "@tanstack/ai-client";
import { localStoragePersistence } from "@tanstack/ai-client";
import type { ChatClientPersistence, ChatPersistedState } from "@tanstack/ai-client";
import type {
	AiChatThread,
	CreateChatThreadInput,
	LocalChatStorageOptions,
	MaybePromise,
	UpdateChatThreadPatch
} from "./types.js";

export type { AiChatThread, CreateChatThreadInput, LocalChatStorageOptions, UpdateChatThreadPatch };

export interface ChatStorage {
	listThreads(): MaybePromise<AiChatThread[]>;
	getThread(id: string): MaybePromise<AiChatThread | null>;
	createThread(input?: CreateChatThreadInput): MaybePromise<AiChatThread>;
	updateThread(id: string, patch: UpdateChatThreadPatch): MaybePromise<void>;
	deleteThread(id: string): MaybePromise<void>;
	getMessages(threadId: string): MaybePromise<UIMessage[] | null>;
	saveMessages(threadId: string, messages: UIMessage[]): MaybePromise<void>;
	deleteMessages(threadId: string): MaybePromise<void>;
}

export function toMessagePersistence(storage: ChatStorage): ChatClientPersistence {
	return {
		getItem: async (threadId) => {
			const messages = await storage.getMessages(threadId);
			if (!messages) return null;
			return { messages } satisfies ChatPersistedState;
		},
		setItem: (threadId, state) => storage.saveMessages(threadId, state.messages),
		removeItem: (threadId) => storage.deleteMessages(threadId)
	};
}

function sortThreads(threads: Iterable<AiChatThread>): AiChatThread[] {
	return [...threads].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

const LOCAL_STORAGE_PROBE_KEY = "__vpaa_ui_storage_probe__";

export function canUseLocalChatStorage(): boolean {
	if (typeof localStorage === "undefined") return false;

	try {
		localStorage.setItem(LOCAL_STORAGE_PROBE_KEY, "1");
		localStorage.removeItem(LOCAL_STORAGE_PROBE_KEY);
		return true;
	} catch {
		return false;
	}
}

function readThreadCatalog(key: string): AiChatThread[] {
	if (typeof localStorage === "undefined") return [];

	try {
		const raw = localStorage.getItem(key);
		if (!raw) return [];
		return JSON.parse(raw) as AiChatThread[];
	} catch {
		return [];
	}
}

function writeThreadCatalog(key: string, threads: AiChatThread[]) {
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
			const thread: AiChatThread = {
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
		getMessages: async (threadId) => {
			const state = await messages.getItem(threadId);
			if (!state) return null;
			return Array.isArray(state) ? state : state.messages;
		},
		saveMessages: (threadId, messageList) => messages.setItem(threadId, { messages: messageList }),
		deleteMessages: (threadId) => messages.removeItem(threadId)
	};
}

export function createMemoryChatStorage(initialThreads: AiChatThread[] = []): ChatStorage {
	const threads = new Map(initialThreads.map((thread) => [thread.id, { ...thread }]));
	const messageHistory = new Map<string, UIMessage[]>();

	return {
		listThreads: () => sortThreads(threads.values()),
		getThread: (id) => threads.get(id) ?? null,
		createThread: (input = {}) => {
			const thread: AiChatThread = {
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
			messageHistory.delete(id);
		},
		getMessages: (threadId) => messageHistory.get(threadId) ?? null,
		saveMessages: (threadId, messages) => {
			messageHistory.set(threadId, structuredClone(messages));
		},
		deleteMessages: (threadId) => {
			messageHistory.delete(threadId);
		}
	};
}
