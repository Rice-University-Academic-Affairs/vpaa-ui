<script lang="ts">
	import { page } from "$app/state";
	import { AppShell } from "$lib/index.js";
	import type { AiChatSession } from "$lib/ai-chat/session/create-session.svelte.js";
	import { createShowcaseChatSessionIfAvailable } from "./showcase/chat.js";
	import type { AppNavGroup } from "$lib/types/navigation.js";
	import { faculty } from "./showcase.js";
	import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
	import "./layout.css";

	let { children }: { children: import("svelte").Snippet } = $props();

	const navigation: AppNavGroup[] = [
		{
			items: [{ label: "Showcase", href: "/", icon: LayoutDashboard, exact: true }]
		}
	];

	let chatSession = $state<AiChatSession | undefined>(undefined);

	$effect(() => {
		if (!chatSession) {
			chatSession = createShowcaseChatSessionIfAvailable() ?? undefined;
		}
	});

	function handleSearchSelect(_item: unknown) {}
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
