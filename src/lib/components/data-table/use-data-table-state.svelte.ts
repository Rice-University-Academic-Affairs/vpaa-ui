import type { DataTableFilter, DataTableSearch, FilterState } from "$lib/types/data-table.js";

export function useDataTableState<TData extends Record<string, unknown>>(
	getRows: () => TData[],
	getSearch?: () => DataTableSearch | undefined,
	getFilters?: () => DataTableFilter[] | undefined
) {
	let searchQuery = $state("");
	let filterState = $state<FilterState>({});

	const activeCount = $derived(
		Object.values(filterState).reduce((sum, values) => sum + values.length, 0)
	);

	const filteredData = $derived.by(() => {
		const rows = getRows();
		const search = getSearch?.();
		const filters = getFilters?.();
		const query = searchQuery.trim().toLowerCase();

		return rows.filter((row) => {
			if (search && query) {
				const matchesSearch = search.columns.some((column) =>
					String(row[column] ?? "")
						.toLowerCase()
						.includes(query)
				);
				if (!matchesSearch) return false;
			}

			if (filters) {
				for (const filter of filters) {
					const selected = filterState[filter.column] ?? [];
					if (selected.length === 0) continue;
					const rowValue = String(row[filter.column] ?? "");
					if (!selected.includes(rowValue)) return false;
				}
			}

			return true;
		});
	});

	function toggleFilter(column: string, value: string) {
		const current = filterState[column] ?? [];
		filterState = {
			...filterState,
			[column]: current.includes(value)
				? current.filter((entry) => entry !== value)
				: [...current, value]
		};
	}

	function isFilterActive(column: string, value: string) {
		return (filterState[column] ?? []).includes(value);
	}

	function removeFilter(column: string, value: string) {
		const current = filterState[column] ?? [];
		filterState = {
			...filterState,
			[column]: current.filter((entry) => entry !== value)
		};
	}

	function clearAllFilters() {
		if (Object.keys(filterState).length === 0) return;
		filterState = {};
	}

	function clearSearch() {
		if (searchQuery === "") return;
		searchQuery = "";
	}

	return {
		get searchQuery() {
			return searchQuery;
		},
		set searchQuery(value: string) {
			searchQuery = value;
		},
		get filterState() {
			return filterState;
		},
		get activeCount() {
			return activeCount;
		},
		get filteredData() {
			return filteredData;
		},
		toggleFilter,
		isFilterActive,
		removeFilter,
		clearAllFilters,
		clearSearch
	};
}

export type DataTableState<TData extends Record<string, unknown>> = ReturnType<
	typeof useDataTableState<TData>
>;
