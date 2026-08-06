import type { AnyClientTool } from "@tanstack/ai";
import { createAiChat, type AiChatClient } from "./create-ai-chat.svelte.js";
import { buildThreadMetadataSync } from "./session-sync.js";
import {
	createMemoryChatStorage,
	toMessagePersistence,
	type ChatThreadRecord,
	type ChatStorage,
	type CreateChatThreadInput
} from "./storage.js";
import { resolveAiChatTransport, type AiChatTransport } from "./transport.js";

export type CreateAiChatSessionOptions = {
	storage?: ChatStorage;
	transport?: AiChatTransport;
	endpoint?: string;
	clientTools?: readonly AnyClientTool[];
	threadId?: string;
};

async function awaitValue<T>(value: T | Promise<T>): Promise<T> {
	return await value;
}

export function createAiChatSession(options: CreateAiChatSessionOptions = {}) {
	const storage = options.storage ?? createMemoryChatStorage();
	const transport = options.transport ?? options.endpoint ?? "/api/chat";
	const resolvedTransport = resolveAiChatTransport(transport);
	const messagePersistence =
		resolvedTransport.persistence === true ? true : toMessagePersistence(storage);

	let threads = $state<ChatThreadRecord[]>([]);
	const initialThreadId = options.threadId ?? null;
	let selectedThreadId = $state<string | null>(initialThreadId);
	let chat = $state<AiChatClient>(createChatForThread(initialThreadId));

	function createChatForThread(threadId: string | null): AiChatClient {
		return createAiChat({
			transport,
			threadId: threadId ?? undefined,
			persistence: messagePersistence,
			tools: options.clientTools,
			onFinish: () => {
				void syncThreadMetadata(threadId);
			}
		});
	}

	async function refreshThreads() {
		threads = await awaitValue(storage.listThreads());
	}

	async function syncThreadMetadata(threadId: string | null) {
		if (!threadId) return;

		const sync = buildThreadMetadataSync(
			threadId,
			chat.messages,
			await awaitValue(storage.getThread(threadId))
		);
		if (!sync) return;

		if (sync.create) {
			await awaitValue(storage.createThread(sync.create));
		} else if (sync.patch) {
			await awaitValue(storage.updateThread(threadId, sync.patch));
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
		const thread = await awaitValue(storage.createThread(input));
		await refreshThreads();
		await selectThread(thread.id);
		return thread;
	}

	async function deleteThread(threadId: string) {
		await awaitValue(storage.deleteThread(threadId));
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
