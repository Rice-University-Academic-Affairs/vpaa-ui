<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { getAdminContext } from "$lib/admin/context.js";
	import { getResourceBySlug, resourcePluralLabel } from "$lib/admin/generated/resources.js";
	import AdminShell from "$lib/admin/components/AdminShell.svelte";
	import AdminErrorView from "$lib/admin/components/AdminError.svelte";
	import ResourceListPanel from "$lib/admin/components/ResourceListPanel.svelte";
	import { Button } from "$lib/components/ui/button/index.js";

	getAdminContext();
	const slug = $derived(page.params.resource ?? "");
	const resource = $derived(getResourceBySlug(slug));
	const title = $derived(resource ? resourcePluralLabel(resource.name) : "Not found");
</script>

{#if !resource}
	<AdminShell title="Not found">
		<AdminErrorView title="Not found" message={`Unknown resource "${slug}".`} kind="not_found" />
	</AdminShell>
{:else}
	<AdminShell {title}>
		{#snippet actions()}
			<Button href={resolve(`/admin/${slug}/new`)}>New</Button>
		{/snippet}
		{#key slug}
			<ResourceListPanel {resource} {slug} />
		{/key}
	</AdminShell>
{/if}
