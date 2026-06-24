<script lang="ts" generics="TData extends Record<string, unknown>">
	import XIcon from "@lucide/svelte/icons/x";
	import type { DataTableFilter } from "$lib/types/data-table.js";
	import type { DataTableState } from "./use-data-table-state.svelte.js";

	type Props = {
		filters: DataTableFilter[];
		tableState: DataTableState<TData>;
		filteredCount: number;
		onFilterChange?: () => void;
	};

	let { filters, tableState, filteredCount, onFilterChange }: Props = $props();

	function optionLabel(filter: DataTableFilter, value: string) {
		return filter.options.find((option) => option.value === value)?.label ?? value;
	}
</script>

<div class="border-border bg-muted/40 flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
	<span class="caption">Showing {filteredCount}</span>

	{#each filters as filter (filter.column)}
		{#each tableState.filterState[filter.column] ?? [] as value (value)}
			<span
				class="border-border bg-background inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[13px]"
			>
				<span class="text-muted-foreground">{filter.label}:</span>
				<span class="text-strong font-semibold">{optionLabel(filter, value)}</span>
				<button
					type="button"
					class="text-muted-foreground hover:text-foreground"
					aria-label="Remove {filter.label} {optionLabel(filter, value)}"
					onclick={() => {
						tableState.removeFilter(filter.column, value);
						onFilterChange?.();
					}}
				>
					<XIcon class="size-3.5" />
				</button>
			</span>
		{/each}
	{/each}

	<button
		type="button"
		class="text-strong ms-auto text-[13px] font-semibold"
		onclick={() => {
			tableState.clearAllFilters();
			onFilterChange?.();
		}}
	>
		Clear all
	</button>
</div>
