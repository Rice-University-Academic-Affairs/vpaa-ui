import type { ConnectConnectionAdapter, RunAgentInputContext } from "@tanstack/ai-client";
import { fetchServerSentEvents, type ChatPersistenceOption } from "@tanstack/ai-svelte";
import type { UIMessage } from "@tanstack/ai-client";
import type { MaybePromise } from "./types.js";
import { chunksFromResponseBody, chunksFromText, chunksFromTextStream } from "./simple-chat-stream.js";

export type ChatHandlerInput = {
	threadId: string;
	messages: UIMessage[];
	signal: AbortSignal;
};

export type ChatHandler = (
	input: ChatHandlerInput
) => MaybePromise<string | AsyncIterable<string>>;

export type ChatConfig =
	| string
	| ChatHandler
	| {
			endpoint: string;
			props?: Record<string, unknown>;
	  }
	| {
			mode: "tanstack-sse";
			endpoint: string;
			props?: Record<string, unknown>;
	  }
	| {
			mode: "server";
			endpoint: string;
			props?: Record<string, unknown>;
	  };

export type ResolvedAiChat = {
	connection: ConnectConnectionAdapter;
	persistence?: ChatPersistenceOption;
	forwardedProps?: Record<string, unknown>;
};

function parseJsonMessage(body: unknown): string {
	if (typeof body === "string") return body;
	if (body && typeof body === "object" && "message" in body) {
		const message = (body as { message: unknown }).message;
		return typeof message === "string" ? message : String(message ?? "");
	}
	return "";
}

function createSimpleChatConnection(
	url: string,
	extraBody: Record<string, unknown> = {}
): ConnectConnectionAdapter {
	return {
		async *connect(messages, data, abortSignal, runContext?: RunAgentInputContext) {
			const threadId = runContext?.threadId ?? "";
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					threadId,
					messages,
					...extraBody,
					...data
				}),
				signal: abortSignal
			});

			if (!response.ok) {
				throw new Error(`Chat request failed: ${response.status}`);
			}

			const contentType = response.headers.get("content-type") ?? "";

			if (contentType.includes("text/plain") && response.body) {
				yield* chunksFromResponseBody(response.body, threadId, abortSignal);
				return;
			}

			if (contentType.includes("application/json")) {
				yield* chunksFromText(parseJsonMessage(await response.json()), threadId);
				return;
			}

			yield* chunksFromText(await response.text(), threadId);
		}
	};
}

function createHandlerConnection(handler: ChatHandler): ConnectConnectionAdapter {
	return {
		async *connect(messages, _data, abortSignal, runContext?: RunAgentInputContext) {
			const threadId = runContext?.threadId ?? "";
			if (!abortSignal) {
				throw new Error("Chat handler requires an AbortSignal");
			}

			const result = await handler({
				threadId,
				messages: messages as UIMessage[],
				signal: abortSignal
			});

			if (typeof result === "string") {
				yield* chunksFromText(result, threadId);
				return;
			}

			yield* chunksFromTextStream(result, threadId, abortSignal);
		}
	};
}

export function resolveAiChat(chat: ChatConfig): ResolvedAiChat {
	if (typeof chat === "function") {
		return { connection: createHandlerConnection(chat) };
	}

	if (typeof chat === "string") {
		return { connection: createSimpleChatConnection(chat) };
	}

	if ("mode" in chat && chat.mode === "tanstack-sse") {
		return {
			connection: fetchServerSentEvents(chat.endpoint),
			forwardedProps: chat.props
		};
	}

	if ("mode" in chat && chat.mode === "server") {
		return {
			connection: createSimpleChatConnection(chat.endpoint, chat.props ?? {}),
			persistence: true,
			forwardedProps: chat.props
		};
	}

	return {
		connection: createSimpleChatConnection(chat.endpoint, chat.props ?? {}),
		forwardedProps: chat.props
	};
}
