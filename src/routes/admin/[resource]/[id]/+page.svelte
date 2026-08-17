<script lang="ts">
	import { page } from "$app/state";
	import { getAdminContext } from "$lib/admin/context.js";
	import { getResourceBySlug } from "$lib/admin/generated/resources.js";
	import { humanizeName } from "$lib/admin/conventions.js";
	import { mapAdminError } from "$lib/admin/errors.js";
	import AdminShell from "$lib/admin/components/AdminShell.svelte";
	import AdminErrorView from "$lib/admin/components/AdminError.svelte";
	import EditRecordPanel from "$lib/admin/components/EditRecordPanel.svelte";

	const admin = getAdminContext();
	const slug = $derived(page.params.resource ?? "");
	const id = $derived(page.params.id ?? "");
	const resource = $derived(getResourceBySlug(slug));
	const title = $derived(resource ? humanizeName(resource.name) : "Not found");

	const recordPromise = $derived.by(() => {
		const current = resource;
		const recordId = id;
		if (!current) return null;
		if (current.name === "AdminUser") {
			if (!admin.identity) return null;
			return admin.membership.list(admin.identity).then((result) => {
				const found = result.items.find((row) => row.id === recordId) ?? null;
				return { kind: "member" as const, found };
			});
		}
		return admin.data.get(current.name, recordId).then((found) => ({
			kind: "record" as const,
			found
		}));
	});
</script>

{#if !resource}
	<AdminShell title="Not found">
		<AdminErrorView title="Not found" message={`Unknown resource "${slug}".`} kind="not_found" />
	</AdminShell>
{:else}
	<AdminShell {title}>
		{#key `${slug}:${id}`}
			{#if recordPromise}
				{#await recordPromise}
					<p class="caption">Loading…</p>
				{:then payload}
					{#if (payload.kind === "member" && !payload.found) || (payload.kind === "record" && !payload.found)}
						<AdminErrorView
							title="Not found"
							message={`Record ${id} was not found.`}
							kind="not_found"
						/>
					{:else if payload.kind === "member" && payload.found}
						<EditRecordPanel {resource} {slug} {id} member={payload.found} />
					{:else if payload.kind === "record" && payload.found}
						<EditRecordPanel {resource} {slug} {id} record={payload.found} />
					{/if}
				{:catch err}
					{@const mapped = mapAdminError(err)}
					<AdminErrorView title={mapped.title} message={mapped.message} kind={mapped.kind} />
				{/await}
			{/if}
		{/key}
	</AdminShell>
{/if}
