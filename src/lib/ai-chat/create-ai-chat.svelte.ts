import {
	createChat,
	fetchServerSentEvents,
	type ConnectionAdapter
} from "@tanstack/ai-svelte";
import type { ChatClientOptions } from "@tanstack/ai-client";

export type CreateAiChatOptions = {
	endpoint?: string;
	connection?: ConnectionAdapter;
	threadId?: string;
} & Omit<ChatClientOptions, "connection">;

export function createAiChat(options: CreateAiChatOptions = {}) {
	const endpoint = options.endpoint ?? "/api/chat";

	return createChat({
		...options,
		connection: options.connection ?? fetchServerSentEvents(endpoint),
		threadId: options.threadId
	});
}

export type AiChatClient = ReturnType<typeof createAiChat>;
