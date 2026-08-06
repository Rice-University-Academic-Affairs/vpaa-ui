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

export interface ChatThreadStorage {
	listThreads(): MaybePromise<ChatThreadRecord[]>;
	getThread(id: string): MaybePromise<ChatThreadRecord | null>;
	createThread(input?: CreateChatThreadInput): MaybePromise<ChatThreadRecord>;
	updateThread(id: string, patch: UpdateChatThreadPatch): MaybePromise<void>;
	deleteThread(id: string): MaybePromise<void>;
}

export function createMemoryThreadStorage(
	initialThreads: ChatThreadRecord[] = []
): ChatThreadStorage {
	const threads = new Map(initialThreads.map((thread) => [thread.id, { ...thread }]));

	return {
		listThreads: () => [...threads.values()].sort((a, b) => {
			const aTime = a.updatedAt ?? "";
			const bTime = b.updatedAt ?? "";
			return bTime.localeCompare(aTime);
		}),
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
		}
	};
}
