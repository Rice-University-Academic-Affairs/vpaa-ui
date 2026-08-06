import type { AnyClientTool } from "@tanstack/ai";
import type { ChatPersistenceOption } from "@tanstack/ai-client";
import { createAiChat, type AiChatClient } from "./create-ai-chat.svelte.js";
import {
	createMemoryThreadStorage,
	type ChatThreadRecord,
	type ChatThreadStorage,
	type CreateChatThreadInput
} from "./storage.js";
import { defaultThreadPreview, defaultThreadTitle } from "./thread-metadata.js";
import { resolveAiChatTransport, type AiChatTransport } from "./transport.js";

export type CreateAiChatSessionOptions = {
	threadStorage?: ChatThreadStorage;
	transport?: AiChatTransport;
	endpoint?: string;
	messagePersistence?: ChatPersistenceOption;
	clientTools?: readonly AnyClientTool[];
	threadId?: string;
};

async function awaitValue<T>(value: T | Promise<T>): Promise<T> {
	return await value;
}

export function createAiChatSession(options: CreateAiChatSessionOptions = {}) {
	const threadStorage = options.threadStorage ?? createMemoryThreadStorage();
	const transport =
		options.transport ?? options.endpoint ?? "/api/chat";
	const resolvedTransport = resolveAiChatTransport(transport);

	let threads = $state<ChatThreadRecord[]>([]);
	const initialThreadId = options.threadId ?? null;
	let selectedThreadId = $state<string | null>(initialThreadId);
	let chat = $state<AiChatClient>(createChatForThread(initialThreadId));

	function createChatForThread(threadId: string | null): AiChatClient {
		return createAiChat({
			transport,
			threadId: threadId ?? undefined,
			persistence: options.messagePersistence ?? resolvedTransport.persistence,
			tools: options.clientTools,
			onFinish: () => {
				void syncThreadMetadata(threadId);
			}
		});
	}

	async function refreshThreads() {
		threads = await awaitValue(threadStorage.listThreads());
	}

	async function syncThreadMetadata(threadId: string | null) {
		if (!threadId) return;

		const messages = chat.messages;
		if (messages.length === 0) return;

		const existing = await awaitValue(threadStorage.getThread(threadId));
		const title = defaultThreadTitle(messages);
		const preview = defaultThreadPreview(messages);

		if (!existing) {
			await awaitValue(
				threadStorage.createThread({
					id: threadId,
					title,
					preview,
					updatedAt: new Date().toISOString()
				})
			);
		} else {
			await awaitValue(
				threadStorage.updateThread(threadId, {
					title: existing.title === "New chat" ? title : existing.title,
					preview,
					updatedAt: new Date().toISOString()
				})
			);
		}

		await refreshThreads();
	}

	async function selectThread(threadId: string) {
		if (threadId === selectedThreadId) return;

		chat.stop();
		chat.dispose();
		selectedThreadId = threadId;
		chat = createChatForThread(threadId);
	}

	async function createThread(input: CreateChatThreadInput = {}) {
		const thread = await awaitValue(threadStorage.createThread(input));
		await refreshThreads();
		await selectThread(thread.id);
		return thread;
	}

	async function deleteThread(threadId: string) {
		await awaitValue(threadStorage.deleteThread(threadId));
		await refreshThreads();

		if (selectedThreadId !== threadId) return;

		const nextThread = threads[0] ?? null;
		if (nextThread) {
			await selectThread(nextThread.id);
			return;
		}

		chat.stop();
		chat.dispose();
		selectedThreadId = null;
		chat = createChatForThread(null);
	}

	void refreshThreads().then(async () => {
		if (selectedThreadId) return;
		if (threads.length > 0) {
			await selectThread(threads[0].id);
			return;
		}
		await createThread();
	});

	const selectedThread = $derived(
		threads.find((thread) => thread.id === selectedThreadId) ?? null
	);

	return {
		get chat() {
			return chat;
		},
		get threads() {
			return threads;
		},
		get selectedThreadId() {
			return selectedThreadId;
		},
		get selectedThread() {
			return selectedThread;
		},
		refreshThreads,
		selectThread,
		createThread,
		deleteThread,
		dispose() {
			chat.stop();
			chat.dispose();
		}
	};
}

export type AiChatSession = ReturnType<typeof createAiChatSession>;
