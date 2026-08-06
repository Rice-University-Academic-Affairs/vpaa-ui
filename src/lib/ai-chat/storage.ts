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
