<script lang="ts" generics="TData extends Record<string, unknown>">
	import { createTable } from "@tanstack/svelte-table";
	import { dataTableFeatures } from "$lib/components/data-table/table-features.js";
	import type { Column } from "$lib/types/data-table.js";
	import { cn } from "$lib/utils.js";
	import { buildColumnDefs } from "./build-column-defs.js";
	import DataTableActiveFilters from "./DataTableActiveFilters.svelte";
	import DataTableCard from "./DataTableCard.svelte";
	import DataTableGrid from "./DataTableGrid.svelte";
	import DataTablePagination from "./DataTablePagination.svelte";
	import DataTableToolbar from "./DataTableToolbar.svelte";
	import { deriveFilters, deriveSearch } from "./derive-table-config.js";
	import { stabilizeTableScroll } from "./stabilize-table-scroll.js";
	import { useDataTableState } from "./use-data-table-state.svelte.js";
	import { createDataTableId } from "./data-table-id.js";
	import { tick } from "svelte";

	type Props = {
		columns: Column[];
		data: TData[];
		title?: string;
		pageSize?: number;
		emptyMessage?: string;
		searchPlaceholder?: string;
		class?: string;
	};

	let {
		columns,
		data,
		title,
		pageSize = 10,
		emptyMessage = "No results.",
		searchPlaceholder,
		class: className
	}: Props = $props();

	const instanceId = createDataTableId("data-table");

	const columnDefs = $derived(buildColumnDefs(columns, data));
	const search = $derived(deriveSearch(columns, searchPlaceholder));
	const filters = $derived(deriveFilters(columns, data));

	const tableState = useDataTableState(() => data, () => search, () => filters);

	let rootEl = $state<HTMLDivElement | null>(null);
	let lastScrollPageIndex = 0;

	const table = createTable({
		features: dataTableFeatures,
		get columns() {
			return columnDefs;
		},
		get data() {
			return tableState.filteredData;
		},
		initialState: {
			pagination: { pageIndex: 0, pageSize: 10 }
		}
	});

	$effect(() => {
		const rowCount = tableState.filteredData.length;
		const currentPagination = table.atoms.pagination.get();
		const maxPageIndex = Math.max(0, Math.ceil(rowCount / currentPagination.pageSize) - 1);

		if (currentPagination.pageIndex > maxPageIndex) {
			table.setPageIndex(maxPageIndex);
		}
	});

	$effect(() => {
		if (table.atoms.pagination.get().pageSize === pageSize) return;
		table.setPageSize(pageSize);
		table.setPageIndex(0);
	});

	$effect(() => {
		const currentPageIndex = table.atoms.pagination.get().pageIndex;
		const root = rootEl;
		if (!root || currentPageIndex === lastScrollPageIndex) return;

		const bottomBefore = root.getBoundingClientRect().bottom;
		lastScrollPageIndex = currentPageIndex;

		tick().then(() => {
			stabilizeTableScroll(root, bottomBefore);
		});
	});

	function resetPageIndex() {
		table.setPageIndex(0);
	}

	const hasActiveFilters = $derived(
		tableState.activeCount > 0 || tableState.searchQuery.trim().length > 0
	);

	const emptyText = $derived(
		hasActiveFilters ? "No results match these filters. Try clearing one." : emptyMessage
	);
</script>

<div bind:this={rootEl} tabindex="-1" class={cn("flex w-full scroll-mt-4 flex-col outline-none", className)}>
	{#if title}
		<h2 class="heading mb-3 text-xl">{title}</h2>
	{/if}

	<DataTableCard>
		<DataTableToolbar
			{instanceId}
			{table}
			{search}
			{filters}
			{tableState}
			onQueryChange={resetPageIndex}
			onFilterChange={resetPageIndex}
		/>

		{#if tableState.activeCount > 0}
			<DataTableActiveFilters
				{filters}
				{tableState}
				filteredCount={tableState.filteredData.length}
				onFilterChange={resetPageIndex}
			/>
		{/if}

		<DataTableGrid {table} columnCount={columnDefs.length} {emptyText} />
	</DataTableCard>

	<DataTablePagination {table} />
</div>
