<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Textarea } from "$lib/components/ui/textarea/index.js";
	import Send from "@lucide/svelte/icons/send";
	import { cn } from "$lib/utils.js";

	type Props = {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		onSubmit?: (message: string) => void;
		class?: string;
	};

	let {
		value = $bindable(""),
		placeholder = "Ask a question…",
		disabled = false,
		onSubmit,
		class: className
	}: Props = $props();

	let textareaRef = $state<HTMLTextAreaElement | null>(null);

	function submit() {
		const trimmed = value.trim();
		if (!trimmed || disabled) return;
		onSubmit?.(trimmed);
		value = "";
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	}
</script>

<div class={cn("flex flex-col gap-2 border-t border-border bg-card p-4", className)}>
	<div class="flex items-end gap-2">
		<Textarea
			bind:ref={textareaRef}
			bind:value
			{placeholder}
			{disabled}
			rows={2}
			class="min-h-0 flex-1 resize-none"
			onkeydown={handleKeydown}
		/>
		<Button
			type="button"
			size="icon"
			{disabled}
			aria-label="Send message"
			onclick={submit}
		>
			<Send data-icon="inline-start" />
		</Button>
	</div>
	<p class="caption">Press Enter to send, Shift+Enter for a new line.</p>
</div>
