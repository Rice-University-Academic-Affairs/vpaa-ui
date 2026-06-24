<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { DrilldownView } from "$lib/types/drilldown.js";

	type Props = {
		view: DrilldownView;
		groupedLabel: string;
		groupedCount: number;
		groupedUnit: string;
		facultyCount: number;
		onToggle: (view: DrilldownView) => void;
	};

	let { view, groupedLabel, groupedCount, groupedUnit, facultyCount, onToggle }: Props = $props();
</script>

<div class="border-border flex flex-wrap items-center gap-3 border-b px-3 py-2.5">
	<div
		class="bg-secondary flex rounded-lg border border-border p-0.5"
		role="tablist"
		aria-label="Drilldown view"
	>
		<button
			type="button"
			role="tab"
			aria-selected={view === "by-dept"}
			class={cn(
				"rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
				view === "by-dept"
					? "bg-[var(--surface-header)] text-[var(--text-on-navy)]"
					: "text-muted-foreground hover:text-foreground"
			)}
			onclick={() => onToggle("by-dept")}
		>
			{groupedLabel}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={view === "all-faculty"}
			class={cn(
				"rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
				view === "all-faculty"
					? "bg-[var(--surface-header)] text-[var(--text-on-navy)]"
					: "text-muted-foreground hover:text-foreground"
			)}
			onclick={() => onToggle("all-faculty")}
		>
			All faculty
		</button>
	</div>
	<p class="caption">
		{#if view === "by-dept"}
			{groupedCount} {groupedUnit}
		{:else}
			{facultyCount} faculty
		{/if}
	</p>
</div>
