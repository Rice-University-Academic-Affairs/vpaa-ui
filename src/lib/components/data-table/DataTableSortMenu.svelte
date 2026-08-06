<script lang="ts" generics="TData extends Record<string, unknown>">
	import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import SecondaryButton from "$lib/components/buttons/SecondaryButton.svelte";
	import type { DataTableInstance } from "$lib/components/data-table/table-types.js";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";

	type Props = {
		table: DataTableInstance<TData>;
	};

	let { table }: Props = $props();

	const sortableColumns = $derived(
		table.getAllColumns().filter((column) => column.getCanSort() && column.id !== "select")
	);

	const sorting = $derived(table.atoms.sorting.get());
	const sortColumn = $derived(sorting[0]?.id ?? sortableColumns[0]?.id ?? "");
	const sortDesc = $derived(sorting[0]?.desc ?? false);

	function columnLabel(column: (typeof sortableColumns)[number]) {
		const header = column.columnDef.header;
		if (typeof header === "string") return header;
		return column.id.charAt(0).toUpperCase() + column.id.slice(1);
	}

	const currentSortLabel = $derived(
		sortableColumns.find((column) => column.id === sortColumn)?.id
			? columnLabel(sortableColumns.find((column) => column.id === sortColumn)!)
			: "Sort"
	);

	function setSortColumn(columnId: string) {
		table.setSorting([{ id: columnId, desc: sortDesc }]);
		table.setPageIndex(0);
	}

	function setSortDirection(desc: string) {
		if (!sortColumn) return;
		table.setSorting([{ id: sortColumn, desc: desc === "desc" }]);
		table.setPageIndex(0);
	}
</script>

{#if sortableColumns.length > 0}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<SecondaryButton {...props} size="sm" class="gap-1.5">
					<ArrowUpDownIcon class="size-4" />
					{currentSortLabel}
					<ChevronDownIcon class="size-4 opacity-60" />
				</SecondaryButton>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-48">
			<DropdownMenu.Label>Sort by</DropdownMenu.Label>
			<DropdownMenu.RadioGroup value={sortColumn} onValueChange={setSortColumn}>
				{#each sortableColumns as column (column.id)}
					<DropdownMenu.RadioItem value={column.id}>
						{columnLabel(column)}
					</DropdownMenu.RadioItem>
				{/each}
			</DropdownMenu.RadioGroup>
			<DropdownMenu.Separator />
			<DropdownMenu.RadioGroup
				value={sortDesc ? "desc" : "asc"}
				onValueChange={setSortDirection}
			>
				<DropdownMenu.RadioItem value="asc">Ascending</DropdownMenu.RadioItem>
				<DropdownMenu.RadioItem value="desc">Descending</DropdownMenu.RadioItem>
			</DropdownMenu.RadioGroup>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
