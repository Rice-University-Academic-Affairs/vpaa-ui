<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import { listColumns, humanizeName } from "$lib/admin/conventions.js";
	import type { AdminRecord, AdminResource, ListSort } from "$lib/admin/types.js";

	type Props = {
		resource: AdminResource;
		items: AdminRecord[];
		sort: ListSort;
		onSort: (sort: ListSort) => void;
		onRowClick: (item: AdminRecord) => void;
		hasPrev: boolean;
		hasNext: boolean;
		onPrev: () => void;
		onNext: () => void;
		loading?: boolean;
	};

	let {
		resource,
		items,
		sort,
		onSort,
		onRowClick,
		hasPrev,
		hasNext,
		onPrev,
		onNext,
		loading = false
	}: Props = $props();

	const columns = $derived(listColumns(resource));

	function toggleSort(field: string) {
		if (sort.field === field) {
			onSort({ field, direction: sort.direction === "asc" ? "desc" : "asc" });
			return;
		}
		onSort({ field, direction: "asc" });
	}

	function formatCell(value: unknown): string {
		if (value == null) return "";
		if (typeof value === "boolean") return value ? "Yes" : "No";
		if (value instanceof Date) return value.toISOString();
		return String(value);
	}
</script>

<div class="flex flex-col gap-4">
	<div class="overflow-x-auto rounded-2xl border">
		<Table.Root>
			<Table.Header>
				<Table.Row class="bg-muted/40 hover:bg-muted/40">
					{#each columns as column (column.name)}
						<Table.Head>
							<button
								type="button"
								class="hover:text-foreground inline-flex items-center gap-1 font-medium"
								onclick={() => toggleSort(column.name)}
								disabled={loading}
							>
								{humanizeName(column.name)}
								{#if sort.field === column.name}
									<span class="text-muted-foreground text-xs">
										{sort.direction === "asc" ? "↑" : "↓"}
									</span>
								{/if}
							</button>
						</Table.Head>
					{/each}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if loading}
					<Table.Row>
						<Table.Cell colspan={columns.length} class="h-24 text-center">Loading…</Table.Cell>
					</Table.Row>
				{:else if items.length === 0}
					<Table.Row>
						<Table.Cell colspan={columns.length} class="h-24 text-center">No records</Table.Cell>
					</Table.Row>
				{:else}
					{#each items as item (item.id)}
						<Table.Row
							class="hover:bg-muted/50 cursor-pointer"
							role="button"
							tabindex={0}
							onclick={() => onRowClick(item)}
							onkeydown={(event: KeyboardEvent) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onRowClick(item);
								}
							}}
						>
							{#each columns as column (column.name)}
								<Table.Cell class="max-w-48 truncate">{formatCell(item[column.name])}</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<div class="flex items-center gap-2">
		<Button variant="outline" disabled={!hasPrev || loading} onclick={onPrev}>Previous</Button>
		<Button variant="outline" disabled={!hasNext || loading} onclick={onNext}>Next</Button>
	</div>
</div>
