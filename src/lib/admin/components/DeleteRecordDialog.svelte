<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import type { AdminDeleteImpact } from "$lib/admin/types.js";
	import { humanizeName, pluralizeLabel } from "$lib/admin/conventions.js";
	import { canConfirmAdminDelete } from "$lib/admin/delete-inspect.js";

	type Props = {
		open: boolean;
		onConfirm: () => void | Promise<void>;
		loading?: boolean;
		impact?: AdminDeleteImpact | null;
		inspecting?: boolean;
	};

	let {
		open = $bindable(false),
		onConfirm,
		loading = false,
		impact = null,
		inspecting = false
	}: Props = $props();

	const canDelete = $derived(canConfirmAdminDelete(inspecting, impact));
	const title = $derived(
		!impact
			? "Delete record"
			: !impact.canDelete
				? "Cannot delete"
				: impact.cascading.length > 0
					? "Delete record and related data"
					: "Delete record"
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>
				{#if inspecting}
					Checking related records…
				{:else if impact && !impact.canDelete}
					Other records still reference this {humanizeName(impact.resource)}. Remove or reassign
					them first.
				{:else if impact && impact.cascading.length > 0}
					This action cannot be undone. Deleting this {humanizeName(impact.resource)} will also
					permanently delete:
				{:else}
					This action cannot be undone. The record will be permanently deleted.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		{#if impact && (impact.cascading.length > 0 || impact.blocking.length > 0)}
			<ul class="text-muted-foreground flex flex-col gap-1 text-sm">
				{#each impact.blocking as bucket (bucket.resource + bucket.foreignKey + (bucket.reason ?? ""))}
					<li>
						{bucket.count}
						{pluralizeLabel(humanizeName(bucket.resource))}
						{#if bucket.reason === "shared"}
							(shared with another parent)
						{/if}
					</li>
				{/each}
				{#each impact.cascading as bucket (bucket.resource + bucket.foreignKey)}
					<li>
						{bucket.count}
						{pluralizeLabel(humanizeName(bucket.resource))}
					</li>
				{/each}
			</ul>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={loading}>Cancel</Button>
			{#if canDelete}
				<Button
					variant="destructive"
					disabled={loading}
					onclick={() => {
						void onConfirm();
					}}
				>
					{loading ? "Deleting…" : "Delete"}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
