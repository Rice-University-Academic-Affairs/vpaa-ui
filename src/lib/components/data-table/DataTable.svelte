<script lang="ts" generics="TData extends Record<string, unknown>">
	import {
		type PaginationState,
		type SortingState,
		type Updater,
		getCoreRowModel,
		getPaginationRowModel,
		getSortedRowModel
	} from "@tanstack/table-core";
	import { createSvelteTable } from "$lib/components/ui/data-table/index.js";
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

	const columnDefs = $derived(buildColumnDefs(columns, data));
	const search = $derived(deriveSearch(columns, searchPlaceholder));
	const filters = $derived(deriveFilters(columns, data));

	const tableState = useDataTableState(() => data, () => search, () => filters);

	let rootEl = $state<HTMLDivElement | null>(null);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);

	async function handlePaginationChange(updater: Updater<PaginationState>) {
		const previousPageIndex = pagination.pageIndex;
		const next = typeof updater === "function" ? updater(pagination) : updater;
		if (next.pageIndex === previousPageIndex || !rootEl) {
			pagination = next;
			return;
		}
		const bottomBefore = rootEl.getBoundingClientRect().bottom;
		pagination = next;
		await tick();
		stabilizeTableScroll(rootEl, bottomBefore);
	}

	$effect(() => {
		if (pagination.pageSize === pageSize) return;
		pagination = { pageIndex: 0, pageSize };
	});

	const table = createSvelteTable({
		get data() {
			return tableState.filteredData;
		},
		get columns() {
			return columnDefs;
		},
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			}
		},
		onPaginationChange: handlePaginationChange,
		onSortingChange: (updater) => {
			if (typeof updater === "function") {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel()
	});

	function resetPageIndex() {
		if (pagination.pageIndex === 0) return;
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
