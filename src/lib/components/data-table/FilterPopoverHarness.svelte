<script lang="ts">
	import { deriveFilters } from "./derive-table-config.js";
	import { useDataTableState } from "./use-data-table-state.svelte.js";
	import DataTableFilterPopover from "./DataTableFilterPopover.svelte";
	import { facultyColumns, facultyData } from "../../../test/table-fixtures.js";

	const filters = deriveFilters(facultyColumns, facultyData);
	const tableState = useDataTableState(
		() => facultyData,
		() => undefined,
		() => filters
	);
</script>

<DataTableFilterPopover {filters} {tableState} />
