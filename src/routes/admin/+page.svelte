<script lang="ts">
	import { resolve } from "$app/paths";
	import { getAdminContext } from "$lib/admin/context.js";
	import { listResourceEntries, resourcePluralLabel } from "$lib/admin/generated/resources.js";
	import AdminShell from "$lib/admin/components/AdminShell.svelte";

	getAdminContext();
	const resources = $derived(
		listResourceEntries().map((resource) => ({
			slug: resource.slug,
			label: resourcePluralLabel(resource.name)
		}))
	);
</script>

<AdminShell title="Admin">
	<ul class="flex flex-col gap-2">
		{#each resources as resource (resource.slug)}
			<li>
				<a
					href={resolve(`/admin/${resource.slug}`)}
					class="text-foreground hover:text-primary text-base underline-offset-4 hover:underline"
				>
					{resource.label}
				</a>
			</li>
		{/each}
	</ul>
</AdminShell>
