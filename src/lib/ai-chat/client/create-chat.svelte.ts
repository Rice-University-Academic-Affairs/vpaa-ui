import { createChat } from "@tanstack/ai-svelte";
import type { AnyClientTool } from "@tanstack/ai";
import type { ChatClientOptions, ChatPersistenceOption } from "@tanstack/ai-client";
import { DEFAULT_CHAT_ENDPOINT } from "../constants.js";
import {
	normalizeDeprecatedTransport,
	resolveAiChat,
	type ChatEndpoint,
	type DeprecatedChatTransport
} from "../core/chat.js";

export type CreateAiChatOptions = {
	chat?: ChatEndpoint;
	/** @deprecated Use `chat` instead. */
	transport?: DeprecatedChatTransport;
	threadId?: string;
	persistence?: ChatPersistenceOption;
	tools?: readonly AnyClientTool[];
} & Omit<
	ChatClientOptions,
	"connection" | "fetcher" | "tools" | "persistence" | "threadId" | "forwardedProps"
>;

function resolveChatOption(options: Pick<CreateAiChatOptions, "chat" | "transport">): ChatEndpoint {
	if (options.chat !== undefined) return options.chat;
	if (options.transport !== undefined) return normalizeDeprecatedTransport(options.transport);
	return DEFAULT_CHAT_ENDPOINT;
}

export function createAiChat(options: CreateAiChatOptions = {}) {
	const resolved = resolveAiChat(resolveChatOption(options));

	return createChat({
		...options,
		connection: resolved.connection,
		persistence: options.persistence,
		threadId: options.threadId,
		tools: options.tools
	});
}

export type AiChatClient = ReturnType<typeof createAiChat>;
