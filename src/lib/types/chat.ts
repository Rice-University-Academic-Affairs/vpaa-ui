export type AiChatRole = "user" | "assistant";

export type AiChatMessage = {
	id: string;
	role: AiChatRole;
	content: string;
};

export type AiChatThread = {
	id: string;
	title: string;
	preview?: string;
	updatedAt?: string;
};

export type AppShellChat = {
	threads: readonly AiChatThread[];
	messages?: readonly AiChatMessage[];
	selectedThreadId?: string | null;
	onThreadSelect?: (threadId: string) => void;
	onNewThread?: () => void;
	onSendMessage?: (message: string) => void;
};
