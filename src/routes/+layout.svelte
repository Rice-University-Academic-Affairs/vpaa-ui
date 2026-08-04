<script lang="ts">
	import { page } from "$app/state";
	import { AppShell } from "$lib/index.js";
	import type { AppNavGroup } from "$lib/types/navigation.js";
	import type { AiChatMessage, AiChatThread } from "$lib/types/chat.js";
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

	const demoThreads: AiChatThread[] = [
		{
			id: "thread-1",
			title: "Faculty headcount trends",
			preview: "What changed in the last quarter?",
			updatedAt: "2026-03-20"
		},
		{
			id: "thread-2",
			title: "Department budget summary",
			preview: "Show me the top three departments by spend.",
			updatedAt: "2026-03-18"
		},
		{
			id: "thread-3",
			title: "New faculty onboarding",
			preview: "How many new hires joined this year?",
			updatedAt: "2026-03-15"
		}
	];

	const demoMessages: AiChatMessage[] = [
		{
			id: "msg-1",
			role: "user",
			content: "What changed in faculty headcount over the last quarter?"
		},
		{
			id: "msg-2",
			role: "assistant",
			content:
				"Faculty headcount increased by 12 over the last quarter, with the largest gains in Engineering (+5) and Natural Sciences (+4). Would you like a breakdown by department?"
		}
	];

	let selectedThreadId = $state<string | null>("thread-1");

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
	chat={{
		threads: demoThreads,
		messages: demoMessages,
		selectedThreadId,
		onThreadSelect: (id) => (selectedThreadId = id),
		onNewThread: () => console.log("New thread"),
		onSendMessage: (message) => console.log("Send:", message)
	}}
>
	{@render children()}
</AppShell>
