import type { AiChatClient } from "$lib/ai-chat/create-ai-chat.svelte.js";

export type AiChatThread = {
	id: string;
	title: string;
	preview?: string;
	updatedAt?: string;
};

export type AppShellChat = {
	endpoint?: string;
	threads?: readonly AiChatThread[];
	selectedThreadId?: string | null;
	chat?: AiChatClient;
	onThreadSelect?: (threadId: string) => void;
	onNewThread?: () => void;
};
