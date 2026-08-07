<script lang="ts">
	import type { Snippet } from "svelte";
	import { browser } from "$app/environment";
	import { setAdminContext } from "$lib/admin/context.js";
	import { resolveAdminAccess } from "$lib/admin/access.js";
	import {
		getTestAdminContext,
		persistTestIdentity,
		testIdentities,
		type TestAdminHarness
	} from "$lib/admin/test/bootstrap.js";
	import AdminErrorView from "$lib/admin/components/AdminError.svelte";
	import { PageContainer } from "$lib/components/page/index.js";
	import { Button } from "$lib/components/ui/button/index.js";

	let { children }: { children: Snippet } = $props();

	const isAdminTestMode =
		import.meta.env.DEV || import.meta.env.PUBLIC_ADMIN_TEST_MODE === "true";

	let adminCtx = $state<TestAdminHarness | null>(
		isAdminTestMode ? getTestAdminContext() : null
	);

	if (isAdminTestMode && adminCtx) {
		setAdminContext(adminCtx);
		if (browser) {
			window.__ADMIN_TEST__ = {
				setIdentity: (next) => {
					persistTestIdentity(next);
					if (adminCtx) adminCtx.identity = next;
				},
				resetData: () => adminCtx?.resetData(),
				setForbidden: (names) => adminCtx?.setForbidden(names),
				membership: adminCtx.membership,
				data: adminCtx.data,
				identities: testIdentities
			};
		}
	}

	const accessPromise = $derived(
		adminCtx
			? resolveAdminAccess(adminCtx.identity, adminCtx.membership)
			: Promise.resolve({ status: "unauthenticated" as const, identity: null })
	);
</script>

{#if !isAdminTestMode}
	<PageContainer>
		<AdminErrorView
			title="Sign in required"
			message="Admin requires an authenticated Rayfin session."
			kind="unauthorized"
		/>
	</PageContainer>
{:else if !adminCtx}
	<PageContainer>
		<p class="caption">Loading admin…</p>
	</PageContainer>
{:else}
	{#key adminCtx.identity?.userId ?? "anon"}
		{#await accessPromise}
			<PageContainer>
				<p class="caption">Checking access…</p>
			</PageContainer>
		{:then access}
			{#if access.status === "unauthenticated"}
				<PageContainer>
					<div class="flex flex-col gap-4">
						<AdminErrorView
							title="Sign in required"
							message="Sign in with Rayfin to access Admin."
							kind="unauthorized"
						/>
						<Button
							onclick={() => {
								if (adminCtx) adminCtx.identity = testIdentities.TEST_OWNER;
							}}
						>
							Sign in
						</Button>
					</div>
				</PageContainer>
			{:else if access.status === "forbidden"}
				<PageContainer>
					<AdminErrorView
						title="Forbidden"
						message="You do not have administrator access."
						kind="forbidden"
					/>
				</PageContainer>
			{:else}
				{@render children()}
			{/if}
		{:catch}
			<PageContainer>
				<AdminErrorView
					title="Something went wrong"
					message="Unable to verify administrator access."
					kind="unexpected"
				/>
			</PageContainer>
		{/await}
	{/key}
{/if}
