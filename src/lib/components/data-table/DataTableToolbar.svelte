<script lang="ts" generics="TData extends Record<string, unknown>">
	import type { DataTableInstance } from "$lib/components/data-table/table-types.js";
	import SearchIcon from "@lucide/svelte/icons/search";
	import XIcon from "@lucide/svelte/icons/x";
	import SecondaryButton from "$lib/components/buttons/SecondaryButton.svelte";
	import { Input } from "$lib/components/ui/input/index.js";
	import type { DataTableFilter, DataTableSearch } from "$lib/types/data-table.js";
	import DataTableFilterPopover from "./DataTableFilterPopover.svelte";
	import DataTableSortMenu from "./DataTableSortMenu.svelte";
	import type { DataTableState } from "./use-data-table-state.svelte.js";

	type Props = {
		instanceId: string;
		table: DataTableInstance<TData>;
		search?: DataTableSearch;
		filters?: DataTableFilter[];
		tableState: DataTableState<TData>;
		showSort?: boolean;
		onQueryChange?: () => void;
		onFilterChange?: () => void;
	};

	let {
		instanceId,
		table,
		search,
		filters = [],
		tableState,
		showSort = true,
		onQueryChange,
		onFilterChange
	}: Props = $props();

	const searchInputId = $derived(`${instanceId}-search`);

	const showToolbar = $derived(
		Boolean(
			search ||
				filters.length > 0 ||
				(showSort && table.getAllColumns().some((column) => column.getCanSort()))
		)
	);
</script>

{#if showToolbar}
	<div class="border-border flex flex-wrap items-center gap-2 border-b p-3">
		{#if search}
			<div class="relative min-w-0 flex-1 basis-full sm:basis-auto">
				<SearchIcon
					class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
				/>
				<label class="sr-only" for={searchInputId}>{search.placeholder ?? "Search"}</label>
				<Input
					id={searchInputId}
					class="h-9 ps-8 {tableState.searchQuery ? 'pe-8' : ''}"
					placeholder={search.placeholder ?? "Search…"}
					value={tableState.searchQuery}
					oninput={(e) => {
						tableState.searchQuery = e.currentTarget.value;
						onQueryChange?.();
					}}
				/>
				{#if tableState.searchQuery}
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
						aria-label="Clear search"
						onclick={() => {
							tableState.clearSearch();
							onQueryChange?.();
						}}
					>
						<XIcon class="size-4" />
					</button>
				{/if}
			</div>
		{/if}

		{#if filters.length > 0}
			<DataTableFilterPopover {instanceId} {filters} {tableState} {onFilterChange} />
		{/if}

		{#if showSort}
			<DataTableSortMenu {table} />
		{/if}
	</div>
{/if}
