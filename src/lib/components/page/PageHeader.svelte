<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	type Props = {
		title: string;
		description?: string;
		actions?: Snippet;
		class?: string;
	};

	let { title, description, actions, class: className }: Props = $props();
</script>

<div
	class={cn(
		"mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
		className
	)}
>
	<div class="min-w-0 flex-1">
		<h1 class="heading truncate">{title}</h1>
		{#if description}
			<p class="caption mt-1">{description}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
