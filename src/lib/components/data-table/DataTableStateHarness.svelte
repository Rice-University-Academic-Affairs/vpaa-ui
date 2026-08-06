<script lang="ts">
	import type { DataTableFilter, DataTableSearch } from "$lib/types/data-table.js";
	import { useDataTableState, type DataTableState } from "./use-data-table-state.svelte.js";

	type Props<TData extends Record<string, unknown>> = {
		rows: TData[];
		search?: DataTableSearch;
		filters?: DataTableFilter[];
		onState?: (state: DataTableState<TData>) => void;
	};

	let { rows, search, filters, onState }: Props<Record<string, unknown>> = $props();

	const tableState = useDataTableState(
		() => rows,
		() => search,
		() => filters
	);

	$effect(() => {
		onState?.(tableState);
	});
</script>
