<script lang="ts">
	import { page } from "$app/state";
	import { AppShell } from "$lib/index.js";
	import { createShowcaseChatSession } from "./showcase/chat.js";
	import type { AppNavGroup } from "$lib/types/navigation.js";
	import type { FacultyRow } from "$lib/types/drilldown.js";
	import { faculty } from "./showcase.js";
	import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
	import "./layout.css";

	let { children }: { children: import("svelte").Snippet } = $props();

	const navigation: AppNavGroup[] = [
		{
			items: [{ label: "Showcase", href: "/", icon: LayoutDashboard, exact: true }]
		}
	];

	const chatSession = createShowcaseChatSession();

	function handleSearchSelect(item: unknown) {
		console.log("Selected:", (item as FacultyRow).name);
	}
</script>

<AppShell
	appName="VPAA UI"
	{navigation}
	currentPath={page.url.pathname}
	user={{ name: "Cody E." }}
	search={{
		items: faculty,
		field: "name",
		secondaryField: "department",
		placeholder: "Search faculty…",
		onSelect: handleSearchSelect
	}}
	chat={chatSession}
>
	{@render children()}
</AppShell>
