import type { AiChatSession } from "$lib/ai-chat/create-ai-chat-session.svelte.js";

export type AiChatThread = {
	id: string;
	title: string;
	preview?: string;
	updatedAt?: string;
};

export type AppShellChat = AiChatSession;
