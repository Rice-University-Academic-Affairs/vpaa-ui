<script lang="ts">
	import { Checkbox } from "$lib/components/ui/checkbox/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Textarea } from "$lib/components/ui/textarea/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import { fieldControl, humanizeName } from "$lib/admin/conventions.js";
	import type { AdminField } from "$lib/admin/types.js";

	type Props = {
		field: AdminField;
		value: string | boolean;
		onValueChange: (v: string | boolean) => void;
		error?: string;
		disabled?: boolean;
	};

	let { field, value, onValueChange, error, disabled = false }: Props = $props();

	const control = $derived(fieldControl(field));
	const label = $derived(humanizeName(field.name));
	const inputId = $derived(`field-${field.name}`);
	const selectLabel = $derived(
		typeof value === "string" && value !== ""
			? (field.enumValues?.find((entry) => entry === value) ?? value)
			: "Select…"
	);
</script>

<div class="flex flex-col gap-2">
	{#if control === "checkbox"}
		<div class="flex items-center gap-2">
			<Checkbox
				id={inputId}
				checked={value === true}
				onCheckedChange={(checked: boolean | "indeterminate") => onValueChange(checked === true)}
				{disabled}
				aria-invalid={error ? true : undefined}
			/>
			<Label for={inputId}>{label}</Label>
		</div>
	{:else}
		<Label for={inputId}>{label}</Label>
		{#if control === "textarea"}
			<Textarea
				id={inputId}
				value={String(value ?? "")}
				oninput={(event: Event & { currentTarget: HTMLTextAreaElement }) =>
					onValueChange(event.currentTarget.value)}
				{disabled}
				aria-invalid={error ? true : undefined}
			/>
		{:else if control === "select"}
			<Select.Root
				type="single"
				value={typeof value === "string" ? value : ""}
				onValueChange={(next: string) => onValueChange(next ?? "")}
				{disabled}
			>
				<Select.Trigger id={inputId} class="w-full" aria-invalid={error ? true : undefined}>
					{selectLabel}
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						{#each field.enumValues ?? [] as option (option)}
							<Select.Item value={option} label={option}>{option}</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
		{:else if control === "number-integer"}
			<Input
				id={inputId}
				type="text"
				inputmode="numeric"
				value={String(value ?? "")}
				oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
					onValueChange(event.currentTarget.value)}
				{disabled}
				aria-invalid={error ? true : undefined}
			/>
		{:else if control === "number-decimal"}
			<Input
				id={inputId}
				type="text"
				inputmode="decimal"
				value={String(value ?? "")}
				oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
					onValueChange(event.currentTarget.value)}
				{disabled}
				aria-invalid={error ? true : undefined}
			/>
		{:else if control === "date"}
			<Input
				id={inputId}
				type="date"
				value={String(value ?? "")}
				oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
					onValueChange(event.currentTarget.value)}
				{disabled}
				aria-invalid={error ? true : undefined}
			/>
		{:else if control === "datetime-local"}
			<Input
				id={inputId}
				type="datetime-local"
				value={String(value ?? "")}
				oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
					onValueChange(event.currentTarget.value)}
				{disabled}
				aria-invalid={error ? true : undefined}
			/>
		{:else}
			<Input
				id={inputId}
				type="text"
				value={String(value ?? "")}
				oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
					onValueChange(event.currentTarget.value)}
				{disabled}
				aria-invalid={error ? true : undefined}
			/>
		{/if}
	{/if}
	{#if error}
		<p class="text-destructive text-sm">{error}</p>
	{/if}
</div>
