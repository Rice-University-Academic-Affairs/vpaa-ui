import type { AnyClientTool } from "@tanstack/ai";
import type { UIMessage } from "@tanstack/ai-client";
import { createAiChat, type AiChatClient } from "../client/create-chat.svelte.js";
import { DEFAULT_CHAT_TRANSPORT } from "../constants.js";
import { buildThreadMetadataSync } from "../core/session-sync.js";
import { createLocalChatStorage, toMessagePersistence, type ChatStorage } from "../core/storage.js";
import { resolveAiChatTransport, type AiChatTransport } from "../core/transport.js";
import type { AiChatThread, CreateChatThreadInput } from "../core/types.js";

async function awaitValue<T>(value: T | Promise<T>): Promise<T> {
	return await value;
}

export type CreateChatFactory = (
	threadId: string | null,
	onFinish: (messages: UIMessage[]) => void
) => AiChatClient;

export type ChatSessionControllerOptions = {
	storage?: ChatStorage;
	transport?: AiChatTransport;
	tools?: readonly AnyClientTool[];
	threadId?: string | null;
	createChat?: CreateChatFactory;
	onStateChange?: () => void;
};

export class ChatSessionController {
	threads: AiChatThread[] = [];
	selectedThreadId: string | null;
	chat: AiChatClient;

	readonly transport: AiChatTransport;
	readonly messagePersistence: ReturnType<typeof toMessagePersistence> | true;

	private readonly storage: ChatStorage;
	private readonly tools?: readonly AnyClientTool[];
	private readonly createChat: CreateChatFactory;
	private readonly onStateChange?: () => void;

	constructor(options: ChatSessionControllerOptions = {}) {
		this.storage = options.storage ?? createLocalChatStorage();
		this.transport = options.transport ?? DEFAULT_CHAT_TRANSPORT;
		this.tools = options.tools;
		this.selectedThreadId = options.threadId ?? null;

		const resolvedTransport = resolveAiChatTransport(this.transport);
		this.messagePersistence =
			resolvedTransport.persistence === true ? true : toMessagePersistence(this.storage);
		this.onStateChange = options.onStateChange;
		this.createChat =
			options.createChat ??
			((threadId, onFinish) => {
				const client = createAiChat({
					transport: this.transport,
					threadId: threadId ?? undefined,
					persistence: this.messagePersistence,
					tools: this.tools,
					onFinish: () => {
						onFinish(client.messages);
					}
				});
				return client;
			});
		this.chat = this.createChatForThread(this.selectedThreadId);
	}

	createChatForThread(threadId: string | null): AiChatClient {
		return this.createChat(threadId, (messages) => {
			void this.syncThreadMetadata(threadId, messages);
		});
	}

	async refreshThreads() {
		this.threads = await awaitValue(this.storage.listThreads());
		this.onStateChange?.();
	}

	async syncThreadMetadata(threadId: string | null, messages: UIMessage[]) {
		if (!threadId) return;

		const sync = buildThreadMetadataSync(
			threadId,
			messages,
			await awaitValue(this.storage.getThread(threadId))
		);
		if (!sync) return;

		if (sync.create) {
			await awaitValue(this.storage.createThread(sync.create));
		} else if (sync.patch) {
			await awaitValue(this.storage.updateThread(threadId, sync.patch));
		}

		await this.refreshThreads();
	}

	get selectedThread(): AiChatThread | null {
		return this.threads.find((thread) => thread.id === this.selectedThreadId) ?? null;
	}

	async selectThread(threadId: string) {
		if (threadId === this.selectedThreadId) return;

		this.chat.stop();
		this.chat.dispose();
		this.selectedThreadId = threadId;
		this.chat = this.createChatForThread(threadId);
		this.onStateChange?.();
	}

	async createThread(input: CreateChatThreadInput = {}) {
		const thread = await awaitValue(this.storage.createThread(input));
		await this.refreshThreads();
		await this.selectThread(thread.id);
		return thread;
	}

	async deleteThread(threadId: string) {
		await awaitValue(this.storage.deleteThread(threadId));
		await this.refreshThreads();

		if (this.selectedThreadId !== threadId) return;

		const nextThread = this.threads[0] ?? null;
		if (nextThread) {
			await this.selectThread(nextThread.id);
			return;
		}

		this.chat.stop();
		this.chat.dispose();
		this.selectedThreadId = null;
		this.chat = this.createChatForThread(null);
		this.onStateChange?.();
	}

	async bootstrap() {
		await this.refreshThreads();

		if (this.selectedThreadId) return;

		if (this.threads.length > 0) {
			await this.selectThread(this.threads[0]!.id);
			return;
		}

		await this.createThread();
	}

	dispose() {
		this.chat.stop();
		this.chat.dispose();
	}
}
