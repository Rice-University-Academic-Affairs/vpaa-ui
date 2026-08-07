<script lang="ts">
	import { untrack } from "svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { getAdminContext } from "$lib/admin/context.js";
	import {
		parseFormValues,
		recordToFormValues,
		type FormValues
	} from "$lib/admin/form-values.js";
	import { humanizeName } from "$lib/admin/conventions.js";
	import { normalizeEmail } from "$lib/admin/owner-config.js";
	import { mapAdminError } from "$lib/admin/errors.js";
	import AdminErrorView from "$lib/admin/components/AdminError.svelte";
	import RecordForm from "$lib/admin/components/RecordForm.svelte";
	import DeleteRecordDialog from "$lib/admin/components/DeleteRecordDialog.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import type { AdminMembershipRecord, AdminRecord, AdminResource } from "$lib/admin/types.js";

	type Props = {
		resource: AdminResource;
		slug: string;
		id: string;
		record?: AdminRecord | null;
		member?: AdminMembershipRecord | null;
	};

	let { resource, slug, id, record = null, member = null }: Props = $props();

	const admin = getAdminContext();
	const isAdminUser = $derived(resource.name === "AdminUser");

	let values = $state<FormValues>(
		untrack(() =>
			member
				? {
						id: member.id,
						email: member.email,
						createdAt: member.createdAt,
						createdBy: member.createdBy
					}
				: record
					? recordToFormValues(record, resource.fields)
					: {}
		)
	);
	let fieldErrors = $state<Record<string, string>>({});
	let formError = $state<ReturnType<typeof mapAdminError> | null>(null);
	let submitting = $state(false);
	let deleting = $state(false);
	let deleteOpen = $state(false);
	let deleteImpact = $state<Awaited<ReturnType<typeof admin.data.inspectRemove>> | null>(null);
	let inspectingDelete = $state(false);

	async function openDeleteDialog() {
		formError = null;
		deleteImpact = null;
		deleteOpen = true;
		if (resource.name === "AdminUser") return;
		inspectingDelete = true;
		try {
			deleteImpact = await admin.data.inspectRemove(resource.name, id);
		} catch (err) {
			formError = mapAdminError(err);
			deleteOpen = false;
		} finally {
			inspectingDelete = false;
		}
	}

	async function submitUpdate() {
		if (resource.name === "AdminUser") return;
		submitting = true;
		formError = null;
		fieldErrors = {};
		try {
			const parsed = parseFormValues(values, resource.fields);
			const updated = await admin.data.update(resource.name, id, parsed);
			values = recordToFormValues(updated, resource.fields);
		} catch (err) {
			const mapped = mapAdminError(err);
			formError = mapped;
			fieldErrors = mapped.fields ?? {};
		} finally {
			submitting = false;
		}
	}

	async function confirmDelete() {
		deleting = true;
		formError = null;
		try {
			if (resource.name === "AdminUser") {
				await admin.membership.remove(admin.identity!, id);
			} else {
				await admin.data.remove(resource.name, id);
			}
			deleteOpen = false;
			await goto(resolve(`/admin/${slug}`));
		} catch (err) {
			formError = mapAdminError(err);
			deleteOpen = false;
		} finally {
			deleting = false;
		}
	}
</script>

{#if formError && (formError.kind !== "validation" || Object.keys(fieldErrors).length === 0)}
	<div class="mb-4">
		<AdminErrorView title={formError.title} message={formError.message} kind={formError.kind} />
	</div>
{/if}

{#if isAdminUser && member}
	<div class="flex flex-col gap-6">
		{#if member.isOwner}
			<Badge class="w-fit">Owner</Badge>
		{/if}
		<div class="flex flex-col gap-4">
			{#each Object.entries(values) as [name, value] (name)}
				<div class="flex flex-col gap-2">
					<Label for={`member-${name}`}>{humanizeName(name)}</Label>
					<Input id={`member-${name}`} value={String(value ?? "")} disabled readonly />
				</div>
			{/each}
		</div>
		{#if !member.isOwner && normalizeEmail(member.email) !== normalizeEmail(admin.identity?.email ?? "")}
			<div class="border-destructive/20 flex flex-col gap-3 border-t pt-6">
				<p class="text-sm font-medium">Remove administrator</p>
				<Button variant="destructive" onclick={() => void openDeleteDialog()} disabled={deleting}>
					Remove
				</Button>
			</div>
		{/if}
	</div>
{:else}
	<RecordForm
		fields={resource.fields}
		bind:values
		errors={fieldErrors}
		onsubmit={submitUpdate}
		submitLabel="Save"
		disabled={submitting}
	/>
	<div class="border-destructive/20 mt-10 flex flex-col gap-3 border-t pt-6">
		<p class="text-sm font-medium">Delete record</p>
		<Button variant="destructive" onclick={() => void openDeleteDialog()} disabled={deleting}>
			Delete
		</Button>
	</div>
{/if}

<DeleteRecordDialog
	bind:open={deleteOpen}
	onConfirm={confirmDelete}
	loading={deleting}
	impact={deleteImpact}
	inspecting={inspectingDelete}
/>
