import type { AiChatSession } from "$lib/ai-chat/session/create-session.svelte.js";

export type AppShellUser = {
	name: string;
};

export type AppShellSearch = {
	items: readonly unknown[];
	field: string;
	secondaryField?: string;
	onSelect: (item: unknown) => void;
	placeholder?: string;
};

export type AppShellChat = AiChatSession;
