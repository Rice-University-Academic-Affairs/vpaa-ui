<script lang="ts" generics="TData extends Record<string, unknown>">
	import SecondaryButton from "$lib/components/buttons/SecondaryButton.svelte";
	import type { DataTableInstance } from "$lib/components/data-table/table-types.js";

	type Props = {
		table: DataTableInstance<TData>;
	};

	let { table }: Props = $props();

	const pageCount = $derived(table.getPageCount());
	const pageIndex = $derived(table.atoms.pagination.get().pageIndex);
</script>

<div class="flex items-center justify-end gap-2 pt-4">
	<p class="caption me-auto">
		Page {pageIndex + 1} of {Math.max(pageCount, 1)}
	</p>
	<SecondaryButton size="sm" onclick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
		Previous
	</SecondaryButton>
	<SecondaryButton size="sm" onclick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
		Next
	</SecondaryButton>
</div>
