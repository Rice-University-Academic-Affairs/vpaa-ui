<script lang="ts">
	import {
		DataTable,
		DrilldownTable,
		DangerButton,
		MetricCard,
		PageContainer,
		PageHeader,
		PrimaryButton,
		SecondaryButton,
		type Column
	} from "$lib/index.js";
	import { departments, faculty, schools } from "./showcase.js";

	const facultyColumns: Column[] = [
		{ field: "name", style: "title", searchable: true, sortable: true },
		{ field: "department", searchable: true, filterable: true },
		{
			field: "status",
			style: "tag",
			filterable: true,
			labels: { tenured: "Tenured", "tenure-track": "T-track", pending: "Pending" }
		},
		{ field: "fte", style: "metric", sortable: true }
	];

	const schoolColumns: Column[] = [
		{ field: "school", style: "title" },
		{ field: "dean" },
		{ field: "deptCount", style: "metric" },
		{ field: "facultyCount", style: "metric" }
	];

	const departmentColumns: Column[] = [
		{ field: "department", style: "title" },
		{ field: "chair" },
		{ field: "facultyCount", style: "metric" }
	];
</script>

<PageContainer data-app-ready>
	<PageHeader title="Component showcase" description="VPAA UI component library demo" />
	<p class="caption mb-8">
		Full-width navy top bar with optional global search and user badge. Navigation lives in the
		sidebar below the bar.
	</p>

	<section class="mb-10">
		<p class="label mb-3">Buttons</p>
		<div class="flex flex-wrap items-center gap-2">
			<PrimaryButton>Primary</PrimaryButton>
			<SecondaryButton>Secondary</SecondaryButton>
			<DangerButton>Danger</DangerButton>
			<span class="tag-danger">Declined</span>
		</div>
	</section>

	<section class="mb-10">
		<p class="label mb-3">MetricCard</p>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<MetricCard label="Total" value={712} />
			<MetricCard label="Active" value={438} />
			<MetricCard label="Highlighted" value={124} variant="highlight" />
		</div>
	</section>

	<section class="mb-10">
		<p class="label mb-3">Tags</p>
		<div class="flex flex-wrap gap-2">
			<span class="tag-neutral">Draft</span>
			<span class="tag-info">Active</span>
			<span class="tag-success">Approved</span>
			<span class="tag-warning">Pending</span>
			<span class="tag-danger">Declined</span>
		</div>
	</section>

	<section class="mb-10">
		<DataTable
			title="All faculty"
			data={faculty}
			columns={facultyColumns}
			searchPlaceholder="Search faculty…"
		/>
	</section>

	<section class="mb-10">
		<DrilldownTable
			title="Faculty drilldown"
			{schools}
			{departments}
			{faculty}
			columns={{
				school: schoolColumns,
				department: departmentColumns,
				faculty: facultyColumns
			}}
			searchPlaceholder="Search faculty…"
		/>
	</section>

	<section class="mb-10">
		<p class="label mb-3">Typography</p>
		<div class="panel-soft flex flex-col gap-3">
			<h2 class="heading text-2xl">Heading</h2>
			<p class="caption">Caption — supporting text at 13px, muted color.</p>
			<p class="label">Label — uppercase column headers</p>
			<p class="number text-xl">128</p>
		</div>
	</section>
</PageContainer>
