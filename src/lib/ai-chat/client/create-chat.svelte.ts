import { createChat, type ChatPersistenceOption } from "@tanstack/ai-svelte";
import type { AnyClientTool } from "@tanstack/ai";
import type { ChatClientOptions } from "@tanstack/ai-client";
import { DEFAULT_CHAT_ENDPOINT } from "../constants.js";
import { resolveAiChat, type ChatEndpoint } from "../core/chat.js";

export type CreateAiChatOptions = {
	chat?: ChatEndpoint;
	threadId?: string;
	persistence?: ChatPersistenceOption;
	tools?: readonly AnyClientTool[];
} & Omit<
	ChatClientOptions,
	"connection" | "fetcher" | "tools" | "persistence" | "threadId" | "forwardedProps"
>;

export function createAiChat(options: CreateAiChatOptions = {}) {
	const resolved = resolveAiChat(options.chat ?? DEFAULT_CHAT_ENDPOINT);

	return createChat({
		...options,
		connection: resolved.connection,
		persistence: options.persistence,
		threadId: options.threadId,
		tools: options.tools
	});
}

export type AiChatClient = ReturnType<typeof createAiChat>;
