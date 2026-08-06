<script lang="ts" generics="TFaculty extends FacultyRow, TSchool extends SchoolRow = SchoolRow, TDepartment extends DepartmentRow = DepartmentRow">
	import { createTable, type PaginationState, type SortingState, type Updater } from "@tanstack/svelte-table";
	import { dataTableFeatures } from "$lib/components/data-table/table-features.js";
	import { buildColumnDefs } from "$lib/components/data-table/build-column-defs.js";
	import DataTableActiveFilters from "$lib/components/data-table/DataTableActiveFilters.svelte";
	import DataTableCard from "$lib/components/data-table/DataTableCard.svelte";
	import DataTableGrid from "$lib/components/data-table/DataTableGrid.svelte";
	import DataTablePagination from "$lib/components/data-table/DataTablePagination.svelte";
	import DataTableToolbar from "$lib/components/data-table/DataTableToolbar.svelte";
	import { deriveFilters, deriveSearch } from "$lib/components/data-table/derive-table-config.js";
	import { stabilizeTableScroll } from "$lib/components/data-table/stabilize-table-scroll.js";
	import { useDataTableState } from "$lib/components/data-table/use-data-table-state.svelte.js";
	import type { Column } from "$lib/types/data-table.js";
	import { enrichDepartments, enrichSchools } from "./derive-drilldown-rows.js";
	import DrilldownBreadcrumb from "./DrilldownBreadcrumb.svelte";
	import DrilldownViewToggle from "./DrilldownViewToggle.svelte";
	import { useDrilldown } from "./use-drilldown.svelte.js";
	import type {
		DepartmentRow,
		DrilldownPath,
		FacultyRow,
		SchoolRow
	} from "$lib/types/drilldown.js";
	import { cn } from "$lib/utils.js";
	import { tick, untrack } from "svelte";

	type Props<
		TFaculty extends FacultyRow = FacultyRow,
		TSchool extends SchoolRow = SchoolRow,
		TDepartment extends DepartmentRow = DepartmentRow
	> = {
		schools: TSchool[];
		departments: TDepartment[];
		faculty: TFaculty[];
		columns: {
			school: Column[];
			department: Column[];
			faculty: Column[];
		};
		title?: string;
		emptyMessage?: string;
		searchPlaceholder?: string;
		pageSize?: number;
		onPathChange?: (path: DrilldownPath) => void;
		class?: string;
	};

	let {
		schools,
		departments,
		faculty,
		columns,
		title,
		emptyMessage = "No results.",
		searchPlaceholder,
		pageSize = 10,
		onPathChange,
		class: className
	}: Props<TFaculty, TSchool, TDepartment> = $props();

	const drilldown = useDrilldown(
		() => departments,
		() => faculty
	);

	const enrichedSchools = $derived(enrichSchools(schools, departments, faculty));

	const currentData = $derived.by((): Record<string, unknown>[] => {
		switch (drilldown.level) {
			case "schools":
				return enrichedSchools;
			case "departments":
				return enrichDepartments(departments, faculty, drilldown.school!);
			case "all-faculty":
				return drilldown.school
					? drilldown.facultyOfSchool(drilldown.school)
					: drilldown.allFaculty();
			case "faculty-in-dept":
				return drilldown.facultyOfDept(drilldown.school!, drilldown.department!);
		}
	});

	const currentColumnSchema = $derived.by((): Column[] => {
		switch (drilldown.level) {
			case "schools":
				return columns.school;
			case "departments":
				return columns.department;
			case "all-faculty":
			case "faculty-in-dept":
				return columns.faculty;
		}
	});

	const currentColumns = $derived.by(() => {
		const defs = buildColumnDefs(currentColumnSchema, currentData);
		if (drilldown.level === "all-faculty" || drilldown.level === "faculty-in-dept") {
			return defs;
		}
		return defs.map((column) => ({ ...column, enableSorting: false }));
	});

	const facultySearch = $derived(deriveSearch(columns.faculty, searchPlaceholder));
	const facultyFilters = $derived(deriveFilters(columns.faculty, faculty));

	const levelEmptyMessage = $derived.by(() => {
		switch (drilldown.level) {
			case "schools":
				return emptyMessage;
			case "departments":
				return "No departments found in this school.";
			case "all-faculty":
				return drilldown.school ? "No faculty found in this school." : "No faculty found.";
			case "faculty-in-dept":
				return "No faculty found in this department.";
		}
	});

	const showViewToggle = $derived(!drilldown.department);

	const viewToggleGroupedLabel = $derived(drilldown.school ? "By department" : "By school");

	const viewToggleGroupedCount = $derived(
		drilldown.school ? drilldown.deptsOfSchool(drilldown.school).length : schools.length
	);

	const viewToggleGroupedUnit = $derived(drilldown.school ? "departments" : "schools");

	const viewToggleFacultyCount = $derived(
		drilldown.school ? drilldown.facultyOfSchool(drilldown.school).length : faculty.length
	);

	const crumbs = $derived.by(() => {
		const items: { label: string; onClick: (() => void) | null }[] = [
			{
				label: "All schools",
				onClick:
					drilldown.school || drilldown.view === "all-faculty"
						? drilldown.toSchools
						: null
			}
		];

		if (drilldown.school) {
			items.push({
				label: drilldown.school,
				onClick:
					drilldown.department || drilldown.view === "all-faculty"
						? drilldown.toDepartments
						: null
			});
		}

		if (drilldown.department) {
			items.push({
				label: drilldown.department,
				onClick: null
			});
		} else if (drilldown.view === "all-faculty") {
			items.push({
				label: "All faculty",
				onClick: null
			});
		}

		return items;
	});

	const isFacultyLevel = $derived(
		drilldown.level === "all-faculty" || drilldown.level === "faculty-in-dept"
	);

	const activeSearch = $derived(isFacultyLevel ? facultySearch : undefined);
	const activeFilters = $derived(isFacultyLevel ? facultyFilters : []);

	const tableState = useDataTableState(
		() => currentData,
		() => activeSearch,
		() => activeFilters
	);

	let rootEl = $state<HTMLDivElement | null>(null);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);

	async function handlePaginationChange(updater: Updater<PaginationState>) {
		const previousPageIndex = pagination.pageIndex;
		const next = typeof updater === "function" ? updater(pagination) : updater;
		if (next.pageIndex === pagination.pageIndex && next.pageSize === pagination.pageSize) {
			return;
		}
		const root = rootEl;
		const bottomBefore = root?.getBoundingClientRect().bottom;
		pagination = next;
		if (next.pageIndex === previousPageIndex || !root || bottomBefore === undefined) return;
		await tick();
		stabilizeTableScroll(root, bottomBefore);
	}

	$effect(() => {
		if (pagination.pageSize === pageSize) return;
		pagination = { pageIndex: 0, pageSize };
	});

	const table = createTable({
		features: dataTableFeatures,
		get data() {
			return tableState.filteredData;
		},
		get columns() {
			return currentColumns;
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
			const next = typeof updater === "function" ? updater(sorting) : updater;
			if (
				next.length === sorting.length &&
				next.every((entry, index) => {
					const current = sorting[index];
					return current?.id === entry.id && current?.desc === entry.desc;
				})
			) {
				return;
			}
			sorting = next;
		}
	});

	function resetPageIndex() {
		if (pagination.pageIndex === 0) return;
		table.setPageIndex(0);
	}

	const hasActiveFilters = $derived(
		tableState.activeCount > 0 || tableState.searchQuery.trim().length > 0
	);

	const emptyText = $derived(
		hasActiveFilters ? "No results match these filters. Try clearing one." : levelEmptyMessage
	);

	const isDrillable = $derived(
		drilldown.level === "schools" || drilldown.level === "departments"
	);

	function handleRowClick(row: Record<string, unknown>) {
		if (drilldown.level === "schools") {
			drilldown.openSchool(String(row.school));
		} else if (drilldown.level === "departments") {
			drilldown.openDept(String(row.department));
		}
	}

	$effect(() => {
		drilldown.level;
		drilldown.school;
		drilldown.department;
		drilldown.view;

		untrack(() => {
			tableState.clearSearch();
			tableState.clearAllFilters();
			sorting = [];
			table.setPageIndex(0);
		});
	});

	$effect(() => {
		onPathChange?.(drilldown.path);
	});
</script>

<div bind:this={rootEl} tabindex="-1" class={cn("flex w-full scroll-mt-4 flex-col outline-none", className)}>
	{#if title}
		<h2 class="heading mb-3 text-xl">{title}</h2>
	{/if}

	<DataTableCard>
		<DrilldownBreadcrumb {crumbs} />

		{#if showViewToggle}
			<DrilldownViewToggle
				view={drilldown.view}
				groupedLabel={viewToggleGroupedLabel}
				groupedCount={viewToggleGroupedCount}
				groupedUnit={viewToggleGroupedUnit}
				facultyCount={viewToggleFacultyCount}
				onToggle={(next) => {
					drilldown.setView(next);
					resetPageIndex();
				}}
			/>
		{/if}

		<DataTableToolbar
			{table}
			search={activeSearch}
			filters={activeFilters}
			showSort={isFacultyLevel}
			{tableState}
			onQueryChange={resetPageIndex}
			onFilterChange={resetPageIndex}
		/>

		{#if tableState.activeCount > 0}
			<DataTableActiveFilters
				filters={activeFilters}
				{tableState}
				filteredCount={tableState.filteredData.length}
				onFilterChange={resetPageIndex}
			/>
		{/if}

		<DataTableGrid
			{table}
			columnCount={currentColumns.length}
			{emptyText}
			onRowClick={isDrillable ? handleRowClick : undefined}
			rowClickable={() => isDrillable}
		/>
	</DataTableCard>

	<DataTablePagination {table} />
</div>
