import {
	createChat,
	type ChatPersistenceOption
} from "@tanstack/ai-svelte";
import type { AnyClientTool } from "@tanstack/ai";
import type { ChatClientOptions } from "@tanstack/ai-client";
import { resolveAiChatTransport, type AiChatTransport } from "./transport.js";

export type CreateAiChatOptions = {
	transport?: AiChatTransport;
	threadId?: string;
	persistence?: ChatPersistenceOption;
	tools?: readonly AnyClientTool[];
	forwardedProps?: Record<string, unknown>;
} & Omit<
	ChatClientOptions,
	"connection" | "fetcher" | "tools" | "persistence" | "threadId" | "forwardedProps"
>;

export function createAiChat(options: CreateAiChatOptions = {}) {
	const transport = options.transport ?? "/api/chat";
	const resolved = resolveAiChatTransport(transport);

	return createChat({
		...options,
		connection: resolved.connection,
		persistence: options.persistence ?? resolved.persistence,
		forwardedProps: options.forwardedProps ?? resolved.forwardedProps,
		threadId: options.threadId,
		tools: options.tools
	});
}

export type AiChatClient = ReturnType<typeof createAiChat>;
