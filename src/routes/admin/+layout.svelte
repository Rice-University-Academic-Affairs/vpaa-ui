<script lang="ts">
	import type { Snippet } from "svelte";
	import { page } from "$app/state";
	import { setAdminContext, type AdminContext } from "$lib/admin/context.js";
	import type { AdminAccessResult } from "$lib/admin/access.js";
	import { adminResources } from "$lib/admin/generated/resources.js";
	import { isAdminTestMode } from "$lib/admin/mode.js";
	import { RayfinAdminData } from "$lib/admin/rayfin-admin-data.js";
	import { RayfinAdminMembership } from "$lib/admin/rayfin-admin-membership.js";
	import { resolveOwnerAdminEmail } from "$lib/admin/owner-config.js";
	import { getTestAdminContext } from "$lib/admin/test/bootstrap.js";
	import type { AdminData, AdminIdentity } from "$lib/admin/types.js";
	import AdminErrorView from "$lib/admin/components/AdminError.svelte";
	import { PageContainer } from "$lib/components/page/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { getRayfinClient } from "$lib/rayfin/client.js";
	import { FabricAuthConfigError } from "$lib/rayfin/auth.js";

	let {
		data,
		children
	}: {
		data: {
			adminMode: "loading" | "test" | "production";
			access: AdminAccessResult;
			adminError?: string;
		};
		children: Snippet;
	} = $props();

	const testMode = isAdminTestMode();
	let clientInitError = $state<string | null>(null);
	let rayfinReady = $state(false);
	let productionCtx: AdminContext | null = null;

	if (testMode) {
		const harness = getTestAdminContext();
		setAdminContext({
			...harness,
			backends: { data: "memory", membership: "memory" }
		});
	} else {
		try {
			const client = getRayfinClient();
			productionCtx = {
				resources: adminResources,
				data: null as unknown as AdminData,
				membership: new RayfinAdminMembership(client, resolveOwnerAdminEmail()),
				identity: null,
				mode: "rayfin",
				backends: { data: "rayfin", membership: "rayfin" }
			};
			setAdminContext(productionCtx);
		} catch (error) {
			clientInitError =
				error instanceof Error ? error.message : "Unable to initialize admin membership.";
		}
	}

	const access = $derived(data.access);
	const gateError = $derived(clientInitError ?? data.adminError ?? null);
	const identityKey = $derived(page.data.email ?? access.identity?.email ?? "anon");

	$effect(() => {
		if (!productionCtx) return;
		productionCtx.identity = (access.identity as AdminIdentity | null) ?? null;
		if (access.status !== "allowed" || !access.identity) {
			rayfinReady = false;
			return;
		}
		if (rayfinReady && productionCtx.data) return;
		try {
			const client = getRayfinClient();
			productionCtx.data = new RayfinAdminData(client, adminResources);
			productionCtx.membership = new RayfinAdminMembership(client, resolveOwnerAdminEmail());
			clientInitError = null;
			rayfinReady = true;
		} catch (error) {
			rayfinReady = false;
			clientInitError =
				error instanceof FabricAuthConfigError || error instanceof Error
					? error.message
					: "Unable to initialize Rayfin admin data.";
		}
	});
</script>

{#if testMode}
	{#key identityKey}
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
							const harness = window.__ADMIN_TEST__;
							if (harness) void harness.setIdentity(harness.identities.TEST_OWNER);
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
		{:else if access.status === "error"}
			<PageContainer>
				<AdminErrorView
					title="Something went wrong"
					message="Unable to verify administrator access."
					kind="unexpected"
				/>
			</PageContainer>
		{:else}
			{@render children()}
		{/if}
	{/key}
{:else if access.status === "unauthenticated"}
	<PageContainer>
		<AdminErrorView
			title="Sign in required"
			message="Admin requires an authenticated Fabric / Rayfin session."
			kind="unauthorized"
		/>
	</PageContainer>
{:else if access.status === "forbidden"}
	<PageContainer>
		<AdminErrorView
			title="Forbidden"
			message="You do not have administrator access."
			kind="forbidden"
		/>
	</PageContainer>
{:else if gateError || access.status === "error"}
	<PageContainer>
		<AdminErrorView
			title="Something went wrong"
			message={gateError ?? "Unable to verify administrator access."}
			kind="unexpected"
		/>
	</PageContainer>
{:else if access.status === "allowed" && rayfinReady}
	{#key identityKey}
		{@render children()}
	{/key}
{:else}
	<PageContainer>
		<p class="caption">Loading admin…</p>
	</PageContainer>
{/if}
