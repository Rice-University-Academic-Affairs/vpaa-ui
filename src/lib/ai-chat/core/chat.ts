import { fetchServerSentEvents } from "@tanstack/ai-svelte";
import type { ConnectionAdapter } from "@tanstack/ai-svelte";

export type ChatEndpoint = string;

export type ResolvedAiChat = {
	connection: ConnectionAdapter;
};

export function resolveAiChat(chat: ChatEndpoint): ResolvedAiChat {
	return { connection: fetchServerSentEvents(chat) };
}
