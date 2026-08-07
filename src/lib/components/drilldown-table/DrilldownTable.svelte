<script lang="ts" generics="TFaculty extends FacultyRow, TSchool extends SchoolRow = SchoolRow, TDepartment extends DepartmentRow = DepartmentRow">
	import { createTable } from "@tanstack/svelte-table";
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
	import { createDataTableId } from "$lib/components/data-table/data-table-id.js";
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

	const instanceId = createDataTableId("data-table");

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
	let lastScrollPageIndex = 0;

	const table = createTable({
		features: dataTableFeatures,
		get data() {
			return tableState.filteredData;
		},
		get columns() {
			return currentColumns;
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
			table.resetSorting();
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
			{instanceId}
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
