<script module lang="ts">
	import { MemoryAdminData } from "$lib/admin/memory-admin-data.js";
	import { MemoryAdminMembership } from "$lib/admin/membership.js";
	import { adminResources } from "$lib/admin/generated/resources.js";
	import { resolveOwnerAdminEmail } from "$lib/admin/owner-config.js";
	import { createProductSeed } from "$lib/admin/test/identities.js";

	export const isAdminTestMode =
		import.meta.env.DEV || import.meta.env.PUBLIC_ADMIN_TEST_MODE === "true";

	export const testData = new MemoryAdminData({
		resources: adminResources,
		seed: { Product: createProductSeed(30) }
	});

	export const testMembership = new MemoryAdminMembership({
		ownerEmail: resolveOwnerAdminEmail()
	});

	export function resetTestData() {
		testData.reset({ Product: createProductSeed(30) });
		testMembership.reset();
	}
</script>

<script lang="ts">
	import type { Snippet } from "svelte";
	import { setAdminContext } from "$lib/admin/context.js";
	import { resolveAdminAccess } from "$lib/admin/access.js";
	import { adminResources as resources } from "$lib/admin/generated/resources.js";
	import { TEST_OWNER } from "$lib/admin/test/identities.js";
	import type { AdminIdentity } from "$lib/admin/types.js";
	import AdminErrorView from "$lib/admin/components/AdminError.svelte";
	import { PageContainer } from "$lib/components/page/index.js";
	import { Button } from "$lib/components/ui/button/index.js";

	let { children }: { children: Snippet } = $props();

	let adminCtx = $state({
		resources,
		data: testData,
		membership: testMembership,
		identity: (isAdminTestMode ? TEST_OWNER : null) as AdminIdentity | null,
		mode: "memory" as const
	});

	if (isAdminTestMode) {
		setAdminContext(adminCtx);
	}

	if (typeof window !== "undefined" && isAdminTestMode) {
		window.__ADMIN_TEST__ = {
			setIdentity: (next) => {
				adminCtx.identity = next;
			},
			resetData: () => {
				resetTestData();
			},
			membership: testMembership,
			data: testData
		};
	}

	const accessPromise = $derived(
		isAdminTestMode
			? resolveAdminAccess(adminCtx.identity, testMembership)
			: Promise.resolve({
					status: "unauthenticated" as const,
					identity: null
				})
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
								adminCtx.identity = TEST_OWNER;
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
