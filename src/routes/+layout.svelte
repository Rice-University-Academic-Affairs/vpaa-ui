<script lang="ts">
	import { page } from "$app/state";
	import { browser } from "$app/environment";
	import { AppShell } from "$lib/index.js";
	import type { AiChatSession } from "$lib/ai-chat/session/create-session.svelte.js";
	import { createShowcaseChatSessionIfAvailable } from "./showcase/chat.js";
	import { faculty } from "./showcase.js";
	import { buildPrimaryNavigation } from "$lib/auth/navigation.js";
	import { isAdminTestMode } from "$lib/admin/mode.js";
	import { getTestAdminContext } from "$lib/admin/test/bootstrap.js";
	import { installAdminTestWindow } from "$lib/admin/test/install-harness.js";
	import "./layout.css";

	let { data, children }: { data: { isAdmin?: boolean; email?: string | null }; children: import("svelte").Snippet } =
		$props();

	if (isAdminTestMode() && browser) {
		installAdminTestWindow(getTestAdminContext());
	}

	const navigation = $derived(buildPrimaryNavigation({ isAdmin: Boolean(data.isAdmin) }));

	let chatSession = $state<AiChatSession | undefined>(undefined);
	let searchSelection = $state("");

	$effect(() => {
		if (!chatSession) {
			chatSession = createShowcaseChatSessionIfAvailable() ?? undefined;
		}
	});

	function handleSearchSelect(item: unknown) {
		const name = (item as { name?: string }).name;
		searchSelection = name ?? "";
	}
</script>

<span data-search-result={searchSelection} class="sr-only" aria-live="polite"></span>

<AppShell
	appName="VPAA UI"
	{navigation}
	currentPath={page.url.pathname}
	user={{ name: data.email ?? "Signed out" }}
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
