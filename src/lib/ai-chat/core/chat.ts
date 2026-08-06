import type { ConnectConnectionAdapter, RunAgentInputContext } from "@tanstack/ai-client";
import { chunksFromResponseBody, chunksFromText } from "./simple-chat-stream.js";

export type ChatEndpoint = string;

export type ResolvedAiChat = {
	connection: ConnectConnectionAdapter;
};

function parseJsonMessage(body: unknown): string {
	if (typeof body === "string") return body;
	if (body && typeof body === "object" && "message" in body) {
		const message = (body as { message: unknown }).message;
		return typeof message === "string" ? message : String(message ?? "");
	}
	return "";
}

export function createChatConnection(endpoint: ChatEndpoint): ConnectConnectionAdapter {
	return {
		async *connect(messages, _data, abortSignal, runContext?: RunAgentInputContext) {
			const threadId = runContext?.threadId ?? "";
			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ threadId, messages }),
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

export function resolveAiChat(chat: ChatEndpoint): ResolvedAiChat {
	return { connection: createChatConnection(chat) };
}
