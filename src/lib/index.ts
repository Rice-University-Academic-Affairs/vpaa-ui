export { default as AppShell } from "./components/app-shell/AppShell.svelte";

export { default as PageContainer } from "./components/page/PageContainer.svelte";
export { default as PageHeader } from "./components/page/PageHeader.svelte";

export { default as DataTable } from "./components/data-table/DataTable.svelte";
export { default as DrilldownTable } from "./components/drilldown-table/DrilldownTable.svelte";

export { default as MetricCard } from "./components/metric/MetricCard.svelte";

export { default as PrimaryButton } from "./components/buttons/PrimaryButton.svelte";
export { default as SecondaryButton } from "./components/buttons/SecondaryButton.svelte";
export { default as DangerButton } from "./components/buttons/DangerButton.svelte";

export { default as UserBadge } from "./components/user/UserBadge.svelte";
export { default as Search } from "./components/search/Search.svelte";

export { default as AiChat } from "./components/ai-chat/AiChat.svelte";
export { default as AiChatTrigger } from "./components/ai-chat/AiChatTrigger.svelte";
export { default as AiChatPanel } from "./components/ai-chat/AiChatPanel.svelte";
export { default as AiChatThreadList } from "./components/ai-chat/AiChatThreadList.svelte";
export { default as AiChatView } from "./components/ai-chat/AiChatView.svelte";
export { default as AiChatMessages } from "./components/ai-chat/AiChatMessages.svelte";
export { default as AiChatMessage } from "./components/ai-chat/AiChatMessage.svelte";
export { default as AiChatInput } from "./components/ai-chat/AiChatInput.svelte";

export { createAiChat } from "./ai-chat/create-ai-chat.svelte.js";
export type { AiChatClient, CreateAiChatOptions } from "./ai-chat/create-ai-chat.svelte.js";

export { createAiChatSession } from "./ai-chat/create-ai-chat-session.svelte.js";
export type {
	AiChatSession,
	CreateAiChatSessionOptions
} from "./ai-chat/create-ai-chat-session.svelte.js";

export {
	createMemoryChatStorage,
	createMemoryThreadStorage,
	toMessagePersistence,
	type ChatStorage,
	type ChatThreadRecord,
	type ChatThreadStorage,
	type CreateChatThreadInput,
	type UpdateChatThreadPatch
} from "./ai-chat/storage.js";

export { buildThreadMetadataSync, type ThreadMetadataSync } from "./ai-chat/session-sync.js";

export {
	scrollToTopDef,
	createScrollToTopClientTool,
	scrollToTopClientTools
} from "./ai-chat/client-tools.example.js";

export { resolveAiChatTransport, type AiChatTransport, type ResolvedAiChatTransport } from "./ai-chat/transport.js";

export { clientTools, toolDefinition } from "./ai-chat/tools.js";
export type { AnyClientTool, ClientTool, ServerTool, ToolDefinition } from "./ai-chat/tools.js";

export {
	localStoragePersistence,
	sessionStoragePersistence,
	indexedDBPersistence,
	type ChatClientPersistence,
	type ChatPersistenceOption,
	type ChatPersistedState
} from "@tanstack/ai-svelte";

export {
	defaultThreadPreview,
	defaultThreadTitle,
	firstUserMessageText,
	lastAssistantMessageText,
	messageText,
	truncateText
} from "./ai-chat/thread-metadata.js";

export { dataTableFeatures } from "./components/data-table/table-features.js";
export type { DataTableInstance } from "./components/data-table/table-types.js";

export type { Column, ColumnStyle } from "./types/data-table.js";
export type { AppNavGroup, AppNavItem, AppNavIcon } from "./types/navigation.js";
export { isNavItemActive } from "./types/navigation.js";
export type { AppShellUser, AppShellSearch, AppShellChat } from "./types/shell.js";
export type { AiChatThread } from "./types/chat.js";

export type {
	DepartmentRow,
	DrilldownPath,
	DrilldownView,
	FacultyRow,
	SchoolRow
} from "./types/drilldown.js";
