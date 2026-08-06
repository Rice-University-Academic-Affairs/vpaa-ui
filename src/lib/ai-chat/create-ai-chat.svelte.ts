import {
	createChat,
	type ChatPersistenceOption,
	type ConnectionAdapter
} from "@tanstack/ai-svelte";
import type { AnyClientTool } from "@tanstack/ai";
import type { ChatClientOptions } from "@tanstack/ai-client";
import { resolveAiChatTransport, type AiChatTransport } from "./transport.js";

export type CreateAiChatOptions = {
	transport?: AiChatTransport;
	endpoint?: string;
	connection?: ConnectionAdapter;
	threadId?: string;
	persistence?: ChatPersistenceOption;
	tools?: readonly AnyClientTool[];
} & Omit<
	ChatClientOptions,
	"connection" | "fetcher" | "tools" | "persistence" | "threadId" | "forwardedProps"
> & {
		forwardedProps?: Record<string, unknown>;
	};

export function createAiChat(options: CreateAiChatOptions = {}) {
	const transport =
		options.transport ??
		(options.connection
			? { connection: options.connection, forwardedProps: options.forwardedProps }
			: (options.endpoint ?? "/api/chat"));

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
