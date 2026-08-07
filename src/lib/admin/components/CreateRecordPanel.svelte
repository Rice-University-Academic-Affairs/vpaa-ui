<script lang="ts">
	import { untrack } from "svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { getAdminContext } from "$lib/admin/context.js";
	import { emptyFormValues, parseFormValues, type FormValues } from "$lib/admin/form-values.js";
	import { mapAdminError } from "$lib/admin/errors.js";
	import AdminErrorView from "$lib/admin/components/AdminError.svelte";
	import RecordForm from "$lib/admin/components/RecordForm.svelte";
	import FieldInput from "$lib/admin/components/FieldInput.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import type { AdminField, AdminResource } from "$lib/admin/types.js";

	type Props = {
		resource: AdminResource;
		slug: string;
	};

	let { resource, slug }: Props = $props();

	const admin = getAdminContext();
	const isAdminUser = $derived(resource.name === "AdminUser");

	const emailField: AdminField = {
		name: "email",
		type: "string",
		nullable: false,
		readOnly: false,
		generated: false
	};

	let values = $state<FormValues>(
		untrack(() => (resource.name === "AdminUser" ? {} : emptyFormValues(resource.fields)))
	);
	let email = $state("");
	let fieldErrors = $state<Record<string, string>>({});
	let error = $state<ReturnType<typeof mapAdminError> | null>(null);
	let submitting = $state(false);

	async function submitCreate() {
		if (submitting) return;
		submitting = true;
		error = null;
		fieldErrors = {};
		try {
			if (resource.name === "AdminUser") {
				const record = await admin.membership.add(admin.identity!, email);
				await goto(resolve(`/admin/${slug}/${record.id}`));
				return;
			}
			const parsed = parseFormValues(values, resource.fields);
			const record = await admin.data.create(resource.name, parsed);
			await goto(resolve(`/admin/${slug}/${record.id}`));
		} catch (err) {
			const mapped = mapAdminError(err);
			error = mapped;
			fieldErrors = mapped.fields ?? {};
		} finally {
			submitting = false;
		}
	}
</script>

{#if error && (error.kind !== "validation" || Object.keys(fieldErrors).length === 0)}
	<div class="mb-4">
		<AdminErrorView title={error.title} message={error.message} kind={error.kind} />
	</div>
{/if}

{#if isAdminUser}
	<form
		class="flex flex-col gap-6"
		onsubmit={(event) => {
			event.preventDefault();
			void submitCreate();
		}}
	>
		<FieldInput
			field={emailField}
			value={email}
			onValueChange={(next) => {
				email = String(next);
			}}
			error={fieldErrors.email}
			disabled={submitting}
		/>
		<div>
			<Button type="submit" disabled={submitting}>Create</Button>
		</div>
	</form>
{:else}
	<RecordForm
		fields={resource.fields}
		bind:values
		errors={fieldErrors}
		onsubmit={submitCreate}
		submitLabel="Create"
		disabled={submitting}
	/>
{/if}
