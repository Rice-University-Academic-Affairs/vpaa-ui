<script lang="ts">
	import DataTable from "./DataTable.svelte";
	import { facultyColumns, facultyData } from "../../../test/table-fixtures.js";
</script>

<div>
	<DataTable
		title="Faculty A"
		data={facultyData}
		columns={facultyColumns}
		searchPlaceholder="Search faculty…"
	/>
	<DataTable
		title="Faculty B"
		data={facultyData}
		columns={facultyColumns}
		searchPlaceholder="Search faculty…"
	/>
</div>
