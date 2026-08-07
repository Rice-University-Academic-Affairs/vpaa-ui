<script lang="ts">
	import { page } from "$app/state";
	import { browser } from "$app/environment";
	import { AppShell } from "$lib/index.js";
	import type { AiChatSession } from "$lib/ai-chat/session/create-session.svelte.js";
	import { createShowcaseChatSessionIfAvailable } from "./showcase/chat.js";
	import type { FacultyRow } from "$lib/types/drilldown.js";
	import { faculty } from "./showcase.js";
	import { buildPrimaryNavigation } from "$lib/auth/navigation.js";
	import {
		getTestAdminContext,
		persistTestIdentity,
		testIdentities
	} from "$lib/admin/test/bootstrap.js";
	import "./layout.css";

	let { data, children }: { data: { isAdmin?: boolean; email?: string | null }; children: import("svelte").Snippet } =
		$props();

	const isAdminTestMode =
		import.meta.env.DEV || import.meta.env.PUBLIC_ADMIN_TEST_MODE === "true";

	if (isAdminTestMode && browser) {
		const harness = getTestAdminContext();
		window.__ADMIN_TEST__ = {
			setIdentity: (next) => {
				persistTestIdentity(next);
				harness.identity = next;
			},
			resetData: () => harness.resetData(),
			setForbidden: (names) => harness.setForbidden(names),
			membership: harness.membership,
			data: harness.data,
			identities: testIdentities
		};
	}

	const navigation = $derived(buildPrimaryNavigation({ isAdmin: Boolean(data.isAdmin) }));

	let chatSession = $state<AiChatSession | undefined>(undefined);

	$effect(() => {
		if (!chatSession) {
			chatSession = createShowcaseChatSessionIfAvailable() ?? undefined;
		}
	});

	function handleSearchSelect(item: unknown) {
		console.log("Selected:", (item as FacultyRow).name);
	}
</script>

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
