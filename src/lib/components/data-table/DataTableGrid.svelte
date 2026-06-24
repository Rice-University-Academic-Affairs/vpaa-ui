<script lang="ts" generics="TData extends Record<string, unknown>">
	import type { Row, Table as TanStackTable } from "@tanstack/table-core";
	import { FlexRender } from "$lib/components/ui/data-table/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import { cn } from "$lib/utils.js";

	type Props = {
		table: TanStackTable<TData>;
		columnCount: number;
		emptyText: string;
		onRowClick?: (row: TData) => void;
		rowClickable?: (row: TData) => boolean;
	};

	let { table, columnCount, emptyText, onRowClick, rowClickable }: Props = $props();

	function isClickable(row: Row<TData>) {
		return Boolean(onRowClick && rowClickable?.(row.original));
	}

	function handleRowClick(row: Row<TData>) {
		if (isClickable(row)) onRowClick?.(row.original);
	}

	function handleRowKeydown(event: KeyboardEvent, row: Row<TData>) {
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
							<FlexRender
								content={header.column.columnDef.header}
								context={header.getContext()}
							/>
						{/if}
					</Table.Head>
				{/each}
			</Table.Row>
		{/each}
	</Table.Header>
	<Table.Body>
		{#each table.getRowModel().rows as row (row.id)}
			{@const clickable = isClickable(row)}
			<Table.Row
				class={cn(clickable && "cursor-pointer hover:bg-[var(--gray-150)]")}
				data-state={row.getIsSelected() ? "selected" : undefined}
				role={clickable ? "button" : undefined}
				tabindex={clickable ? 0 : undefined}
				onclick={() => handleRowClick(row)}
				onkeydown={(e: KeyboardEvent) => handleRowKeydown(e, row)}
			>
				{#each row.getVisibleCells() as cell (cell.id)}
					<Table.Cell>
						<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
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
