<script lang="ts" generics="TData extends Record<string, unknown>">
	import { FlexRender } from "@tanstack/svelte-table";
	import type { Row } from "@tanstack/svelte-table";
	import { dataTableFeatures } from "$lib/components/data-table/table-features.js";
	import type { DataTableInstance } from "$lib/components/data-table/table-types.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import { cn } from "$lib/utils.js";

	type Props = {
		table: DataTableInstance<TData>;
		columnCount: number;
		emptyText: string;
		onRowClick?: (row: TData) => void;
		rowClickable?: (row: TData) => boolean;
	};

	let { table, columnCount, emptyText, onRowClick, rowClickable }: Props = $props();

	const rows = $derived(table.getRowModel().rows);

	function isClickable(row: Row<typeof dataTableFeatures, TData>) {
		return Boolean(onRowClick && rowClickable?.(row.original));
	}

	function handleRowClick(row: Row<typeof dataTableFeatures, TData>) {
		if (isClickable(row)) onRowClick?.(row.original);
	}

	function handleRowKeydown(
		event: KeyboardEvent,
		row: Row<typeof dataTableFeatures, TData>
	) {
		if (!isClickable(row)) return;
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onRowClick?.(row.original);
		}
	}
</script>

<Table.Root>
	<Table.Header>
		{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
			<Table.Row class="bg-muted/40 hover:bg-muted/40">
				{#each headerGroup.headers as header (header.id)}
					<Table.Head colspan={header.colSpan}>
						{#if !header.isPlaceholder}
							<FlexRender {header} />
						{/if}
					</Table.Head>
				{/each}
			</Table.Row>
		{/each}
	</Table.Header>
	<Table.Body>
		{#each rows as row (row.id)}
			{@const clickable = isClickable(row)}
			<Table.Row
				class={cn(clickable && "cursor-pointer hover:bg-[var(--gray-150)]")}
				data-state={undefined}
				role={clickable ? "button" : undefined}
				tabindex={clickable ? 0 : undefined}
				onclick={() => handleRowClick(row)}
				onkeydown={(e: KeyboardEvent) => handleRowKeydown(e, row)}
			>
				{#each row.getAllCells() as cell (cell.id)}
					<Table.Cell>
						<FlexRender {cell} />
					</Table.Cell>
				{/each}
			</Table.Row>
		{:else}
			<Table.Row>
				<Table.Cell colspan={columnCount} class="h-24 text-center">
					<p class="caption">{emptyText}</p>
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
