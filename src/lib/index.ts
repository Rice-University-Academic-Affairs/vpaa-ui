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

export {
	createAiChatSession,
	createLocalChatStorage,
	createMemoryChatStorage,
	clientTools,
	toolDefinition,
	createChatRouteHandler,
	DEFAULT_CHAT_ENDPOINT,
	type AiChatSession,
	type CreateAiChatSessionOptions,
	type ChatStorage,
	type AiChatThread,
	type CreateChatThreadInput,
	type LocalChatStorageOptions,
	type UpdateChatThreadPatch,
	type ChatEndpoint,
	type AnyClientTool,
	type ClientTool,
	type ServerTool,
	type ToolDefinition,
	type ChatRouteHandler,
	type ChatRouteHandlerContext,
	type CreateChatRouteHandlerOptions
} from "./ai-chat/index.js";

export { dataTableFeatures } from "./components/data-table/table-features.js";
export type { DataTableInstance } from "./components/data-table/table-types.js";

export type { Column, ColumnStyle } from "./types/data-table.js";
export type { AppNavGroup, AppNavItem, AppNavIcon } from "./types/navigation.js";
export { isNavItemActive } from "./types/navigation.js";
export type { AppShellUser, AppShellSearch, AppShellChat } from "./types/shell.js";

export type {
	DepartmentRow,
	DrilldownPath,
	DrilldownView,
	FacultyRow,
	SchoolRow
} from "./types/drilldown.js";

export type {
	AdminData,
	AdminField,
	AdminIdentity,
	AdminMembershipService,
	AdminRecord,
	AdminResource,
	AdminResources,
	ListRequest,
	ListResult
} from "./admin/types.js";
export { AdminError } from "./admin/types.js";
export {
	ADMIN_PAGE_SIZE,
	defaultSort,
	fieldControl,
	humanizeName,
	listColumns,
	pluralizeLabel,
	resourceSlug,
	writableFields
} from "./admin/conventions.js";
export { parseFormValues, emptyFormValues, recordToFormValues } from "./admin/form-values.js";
export { mapAdminError } from "./admin/errors.js";
export { resolveAdminAccess } from "./admin/access.js";
export { RayfinAdminData } from "./admin/rayfin-admin-data.js";
export { resolveOwnerAdminEmail, requireOwnerAdminEmail, normalizeEmail } from "./admin/owner-config.js";
export { getAdminContext, setAdminContext, type AdminContext } from "./admin/context.js";
export { adminResources, getResourceBySlug, listResourceEntries, resourcePluralLabel } from "./admin/generated/resources.js";
export { extractResources, formatResourcesModule } from "./admin/generator/extract.js";
export {
	bootstrapAuth,
	identityFromSession,
	loadAppAuth,
	readFabricAuthOptions,
	sessionToAppAuth,
	type AppAuthSession,
	type BootstrapAuthOptions,
	type IAuthService
} from "./rayfin/auth.js";
export { getRayfinClient } from "./rayfin/client.js";
export { buildPrimaryNavigation } from "./auth/navigation.js";
