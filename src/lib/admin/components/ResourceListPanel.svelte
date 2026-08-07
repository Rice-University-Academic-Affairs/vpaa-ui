<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { getAdminContext } from "$lib/admin/context.js";
	import { ADMIN_PAGE_SIZE, defaultSort } from "$lib/admin/conventions.js";
	import { mapAdminError } from "$lib/admin/errors.js";
	import AdminErrorView from "$lib/admin/components/AdminError.svelte";
	import ResourceTable from "$lib/admin/components/ResourceTable.svelte";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import type { AdminRecord, AdminResource, ListSort } from "$lib/admin/types.js";

	type Props = {
		resource: AdminResource;
		slug: string;
	};

	let { resource, slug }: Props = $props();

	const admin = getAdminContext();
	const isAdminUser = $derived(resource.name === "AdminUser");

	let sortOverride = $state<ListSort | null>(null);
	let cursorStack = $state<(string | null)[]>([null]);
	let pageIndex = $state(0);

	const sort = $derived(sortOverride ?? defaultSort(resource));
	const hasPrev = $derived(pageIndex > 0);
	const currentCursor = $derived(cursorStack[pageIndex] ?? null);

	const listPromise = $derived.by(() => {
		if (resource.name === "AdminUser") return null;
		return admin.data.list(resource.name, {
			limit: ADMIN_PAGE_SIZE,
			cursor: currentCursor,
			sort
		});
	});

	const membersPromise = $derived.by(() => {
		if (resource.name !== "AdminUser" || !admin.identity) return null;
		return admin.membership.list(admin.identity);
	});

	function onSort(next: ListSort) {
		sortOverride = next;
		cursorStack = [null];
		pageIndex = 0;
	}

	function onPrev() {
		if (pageIndex <= 0) return;
		pageIndex -= 1;
	}

	function goEdit(id: string) {
		void goto(resolve(`/admin/${slug}/${id}`));
	}
</script>

{#if isAdminUser}
	{#if membersPromise}
		{#await membersPromise}
			<p class="caption">Loading…</p>
		{:then result}
			<div class="flex flex-col gap-4">
				<div class="overflow-x-auto rounded-2xl border">
					<Table.Root>
						<Table.Header>
							<Table.Row class="bg-muted/40 hover:bg-muted/40">
								<Table.Head>Email</Table.Head>
								<Table.Head>User ID</Table.Head>
								<Table.Head>Created At</Table.Head>
								<Table.Head>Created By</Table.Head>
								<Table.Head>Role</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if result.items.length === 0}
								<Table.Row>
									<Table.Cell colspan={5} class="h-24 text-center">No records</Table.Cell>
								</Table.Row>
							{:else}
								{#each result.items as member (member.id)}
									<Table.Row
										class="hover:bg-muted/50 cursor-pointer"
										role="button"
										tabindex={0}
										onclick={() => goEdit(member.id)}
										onkeydown={(event: KeyboardEvent) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												goEdit(member.id);
											}
										}}
									>
										<Table.Cell>{member.email}</Table.Cell>
										<Table.Cell>{member.userId ?? ""}</Table.Cell>
										<Table.Cell>{member.createdAt}</Table.Cell>
										<Table.Cell>{member.createdBy}</Table.Cell>
										<Table.Cell>
											{#if member.isOwner}
												<Badge>Owner</Badge>
											{/if}
										</Table.Cell>
									</Table.Row>
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		{:catch err}
			{@const mapped = mapAdminError(err)}
			<AdminErrorView title={mapped.title} message={mapped.message} kind={mapped.kind} />
		{/await}
	{/if}
{:else if listPromise}
	{#await listPromise}
		<ResourceTable
			{resource}
			items={[] as AdminRecord[]}
			{sort}
			{onSort}
			onRowClick={(item) => goEdit(item.id)}
			{hasPrev}
			hasNext={false}
			{onPrev}
			onNext={() => {}}
			loading={true}
		/>
	{:then result}
		<ResourceTable
			{resource}
			items={result.items}
			{sort}
			{onSort}
			onRowClick={(item) => goEdit(item.id)}
			{hasPrev}
			hasNext={result.hasNextPage}
			{onPrev}
			onNext={() => {
				if (!result.hasNextPage) return;
				if (result.endCursor && cursorStack.length === pageIndex + 1) {
					cursorStack = [...cursorStack, result.endCursor];
				}
				pageIndex += 1;
			}}
			loading={false}
		/>
	{:catch err}
		{@const mapped = mapAdminError(err)}
		<AdminErrorView title={mapped.title} message={mapped.message} kind={mapped.kind} />
	{/await}
{/if}
