<script lang="ts">
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import { cn } from "$lib/utils.js";

	type Props = {
		variant?: "default" | "header";
		expanded?: boolean;
		onclick?: () => void;
		class?: string;
	};

	let { variant = "default", expanded = false, onclick, class: className }: Props = $props();

	const isHeader = $derived(variant === "header");
</script>

<button
	type="button"
	class={cn(
		"flex size-8 shrink-0 items-center justify-center rounded-full",
		isHeader
			? "border-transparent bg-transparent text-[var(--text-on-navy)] hover:bg-white/10"
			: "border-border bg-background hover:bg-muted border",
		className
	)}
	aria-label="Open AI assistant"
	aria-expanded={expanded}
	{onclick}
>
	<Sparkles class="size-4" />
</button>
