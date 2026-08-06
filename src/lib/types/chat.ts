import type { AiChatClient } from "$lib/ai-chat/create-ai-chat.svelte.js";
import type { AiChatSession } from "$lib/ai-chat/create-ai-chat-session.svelte.js";

export type AiChatThread = {
	id: string;
	title: string;
	preview?: string;
	updatedAt?: string;
};

export type AppShellChat = {
	endpoint?: string;
	session?: AiChatSession;
	threads?: readonly AiChatThread[];
	selectedThreadId?: string | null;
	chat?: AiChatClient;
	onThreadSelect?: (threadId: string) => void;
	onNewThread?: () => void;
};
