<script lang="ts" generics="TData extends Record<string, unknown>">
	import FilterIcon from "@lucide/svelte/icons/filter";
	import SecondaryButton from "$lib/components/buttons/SecondaryButton.svelte";
	import { Checkbox } from "$lib/components/ui/checkbox/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import type { DataTableFilter } from "$lib/types/data-table.js";
	import { cn } from "$lib/utils.js";
	import type { DataTableState } from "./use-data-table-state.svelte.js";

	type Props = {
		filters: DataTableFilter[];
		tableState: DataTableState<TData>;
		onFilterChange?: () => void;
	};

	let { filters, tableState, onFilterChange }: Props = $props();
</script>

{#snippet filterSection(filter: DataTableFilter, sticky = false)}
	<p class={cn("label mb-2", sticky && "bg-popover sticky top-0 z-10 pb-2")}>{filter.label}</p>
	<div class="flex flex-col gap-2">
		{#each filter.options as option (option.value)}
			{@const inputId = `data-table-filter-${filter.column}-${option.value}`}
			<div class="flex items-center gap-2">
				<Checkbox
					id={inputId}
					checked={tableState.isFilterActive(filter.column, option.value)}
					onCheckedChange={() => {
						tableState.toggleFilter(filter.column, option.value);
						onFilterChange?.();
					}}
				/>
				<label for={inputId} class="flex flex-1 cursor-pointer items-center text-[13px]">
					{#if option.variant}
						<span class={option.variant}>{option.label}</span>
					{:else}
						{option.label}
					{/if}
				</label>
			</div>
		{/each}
	</div>
{/snippet}

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<SecondaryButton
				{...props}
				size="sm"
				class={cn(
					"gap-1.5",
					tableState.activeCount > 0 && "border-primary/30 bg-tint-info-bg text-strong"
				)}
				aria-haspopup="dialog"
			>
				<FilterIcon class="size-4" />
				Filter
				{#if tableState.activeCount > 0}
					<span
						class="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[11px] font-semibold"
					>
						{tableState.activeCount}
					</span>
				{/if}
			</SecondaryButton>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content
		align="end"
		collisionPadding={12}
		class="w-[230px] overflow-y-auto overscroll-contain p-3"
		style="max-height: var(--bits-popover-content-available-height);"
		portalProps={{ disabled: import.meta.env.VITEST }}
	>
		{#each filters as filter, index (filter.column)}
			{#if index > 0}
				<div class="border-border my-3 border-t"></div>
			{/if}
			{@render filterSection(filter, true)}
		{/each}
	</Popover.Content>
</Popover.Root>
