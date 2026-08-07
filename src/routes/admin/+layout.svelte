<script lang="ts">
	import type { Snippet } from "svelte";
	import { onMount } from "svelte";
	import { setAdminContext, type AdminContext } from "$lib/admin/context.js";
	import { resolveAdminAccess } from "$lib/admin/access.js";
	import { adminResources as resources } from "$lib/admin/generated/resources.js";
	import type { AdminData, AdminIdentity, AdminMembershipService } from "$lib/admin/types.js";
	import AdminErrorView from "$lib/admin/components/AdminError.svelte";
	import { PageContainer } from "$lib/components/page/index.js";
	import { Button } from "$lib/components/ui/button/index.js";

	let { children }: { children: Snippet } = $props();

	const isAdminTestMode =
		import.meta.env.DEV || import.meta.env.PUBLIC_ADMIN_TEST_MODE === "true";

	let ready = $state(!isAdminTestMode);
	let adminCtx = $state<AdminContext | null>(null);
	let testOwner = $state<AdminIdentity | null>(null);

	onMount(() => {
		if (!isAdminTestMode) return;
		void (async () => {
			const [{ MemoryAdminData }, { MemoryAdminMembership }, { resolveOwnerAdminEmail }, identities] =
				await Promise.all([
					import("$lib/admin/memory-admin-data.js"),
					import("$lib/admin/membership.js"),
					import("$lib/admin/owner-config.js"),
					import("$lib/admin/test/identities.js")
				]);

			const data = new MemoryAdminData({
				resources,
				seed: { Product: identities.createProductSeed(30) }
			});
			const membership = new MemoryAdminMembership({
				ownerEmail: resolveOwnerAdminEmail()
			});

			function resetData() {
				data.reset({ Product: identities.createProductSeed(30) });
				membership.reset();
			}

			const ctx: AdminContext = {
				resources,
				data: data as AdminData,
				membership: membership as AdminMembershipService,
				identity: identities.TEST_OWNER,
				mode: "memory"
			};
			adminCtx = ctx;
			testOwner = identities.TEST_OWNER;
			setAdminContext(ctx);

			window.__ADMIN_TEST__ = {
				setIdentity: (next) => {
					if (adminCtx) adminCtx.identity = next;
				},
				resetData,
				setForbidden: (names: string[]) => {
					data.setForbidden(names);
				},
				membership,
				data,
				identities
			};
			ready = true;
		})();
	});

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
{:else if !ready || !adminCtx}
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
						{#if testOwner}
							<Button
								onclick={() => {
									if (adminCtx && testOwner) adminCtx.identity = testOwner;
								}}
							>
								Sign in
							</Button>
						{/if}
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
