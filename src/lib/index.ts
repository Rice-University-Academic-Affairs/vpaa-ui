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

export type { Column, ColumnStyle } from "./types/data-table.js";
export type { AppNavGroup, AppNavItem, AppNavIcon } from "./types/navigation.js";
export { isNavItemActive } from "./types/navigation.js";
export type { AppShellUser, AppShellSearch } from "./types/shell.js";
export type {
	DepartmentRow,
	DrilldownPath,
	DrilldownView,
	FacultyRow,
	SchoolRow
} from "./types/drilldown.js";
