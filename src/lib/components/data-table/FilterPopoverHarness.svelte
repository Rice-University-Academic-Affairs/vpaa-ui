<script lang="ts">
	import { deriveFilters } from "./derive-table-config.js";
	import { useDataTableState } from "./use-data-table-state.svelte.js";
	import DataTableFilterPopover from "./DataTableFilterPopover.svelte";
	import { createDataTableId } from "./data-table-id.js";
	import { facultyColumns, facultyData } from "../../../test/table-fixtures.js";

	const instanceId = createDataTableId("data-table");

	const filters = deriveFilters(facultyColumns, facultyData);
	const tableState = useDataTableState(
		() => facultyData,
		() => undefined,
		() => filters
	);
</script>

<DataTableFilterPopover {instanceId} {filters} {tableState} />
