<script lang="ts">
	import type { DepartmentRow, FacultyRow } from "$lib/types/drilldown.js";
	import { useDrilldown, type DrilldownState } from "./use-drilldown.svelte.js";

	type Props = {
		departments: DepartmentRow[];
		faculty: FacultyRow[];
		onState?: (state: DrilldownState) => void;
	};

	let { departments, faculty, onState }: Props = $props();

	const drilldown = useDrilldown(
		() => departments,
		() => faculty
	);

	$effect(() => {
		onState?.(drilldown);
	});
</script>
