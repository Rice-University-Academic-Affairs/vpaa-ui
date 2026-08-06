import type { AnyClientTool } from "@tanstack/ai";
import { DEFAULT_CHAT_ENDPOINT } from "../constants.js";
import { createLocalChatStorage, type ChatStorage } from "../core/storage.js";
import {
	normalizeDeprecatedTransport,
	type ChatEndpoint,
	type DeprecatedChatTransport
} from "../core/chat.js";
import type { AiChatThread } from "../core/types.js";
import type { AiChatClient } from "../client/create-chat.svelte.js";
import { ChatSessionController } from "./session-controller.js";

export type CreateAiChatSessionOptions = {
	storage?: ChatStorage;
	chat?: ChatEndpoint;
	/** @deprecated Use `chat` instead. */
	transport?: DeprecatedChatTransport;
	tools?: readonly AnyClientTool[];
	threadId?: string;
};

function resolveChatEndpoint(
	options: Pick<CreateAiChatSessionOptions, "chat" | "transport">
): ChatEndpoint {
	if (options.chat !== undefined) return options.chat;
	if (options.transport !== undefined) return normalizeDeprecatedTransport(options.transport);
	return DEFAULT_CHAT_ENDPOINT;
}

export function createAiChatSession(options: CreateAiChatSessionOptions = {}) {
	let threads = $state<AiChatThread[]>([]);
	let selectedThreadId = $state<string | null>(null);
	let chat = $state<AiChatClient | null>(null);

	const controller = new ChatSessionController({
		storage: options.storage,
		chat: resolveChatEndpoint(options),
		tools: options.tools,
		threadId: options.threadId ?? null,
		onStateChange: () => {
			threads = controller.threads;
			selectedThreadId = controller.selectedThreadId;
			chat = controller.chat;
		}
	});

	async function syncFromController() {
		threads = controller.threads;
		selectedThreadId = controller.selectedThreadId;
		chat = controller.chat;
	}

	async function refreshThreads() {
		await controller.refreshThreads();
		await syncFromController();
	}

	async function selectThread(threadId: string) {
		await controller.selectThread(threadId);
		await syncFromController();
	}

	async function createThread(input: Parameters<ChatSessionController["createThread"]>[0] = {}) {
		const thread = await controller.createThread(input);
		await syncFromController();
		return thread;
	}

	async function deleteThread(threadId: string) {
		await controller.deleteThread(threadId);
		await syncFromController();
	}

	void controller.bootstrap().then(syncFromController);

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
			controller.dispose();
		}
	};
}

export type AiChatSession = ReturnType<typeof createAiChatSession>;
