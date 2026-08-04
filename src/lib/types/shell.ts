import type { AppShellChat } from "./chat.js";

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

export type { AppShellChat };
