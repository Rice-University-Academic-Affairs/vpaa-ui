<script lang="ts">
	import { createTable } from "@tanstack/svelte-table";
	import { dataTableFeatures } from "./table-features.js";
	import { buildColumnDefs } from "./build-column-defs.js";
	import DataTableSortMenu from "./DataTableSortMenu.svelte";
	import DataTableGrid from "./DataTableGrid.svelte";
	import { facultyColumns, facultyData } from "../../../test/table-fixtures.js";

	const columnDefs = buildColumnDefs(facultyColumns, facultyData);
	const table = createTable({
		features: dataTableFeatures,
		get columns() {
			return columnDefs;
		},
		get data() {
			return facultyData;
		},
		initialState: {
			pagination: { pageIndex: 0, pageSize: 10 }
		}
	});
</script>

<div>
	<DataTableSortMenu {table} />
	<DataTableGrid {table} columnCount={columnDefs.length} emptyText="No results." />
</div>
