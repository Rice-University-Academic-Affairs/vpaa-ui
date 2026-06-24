<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	type Props = {
		children: Snippet;
		class?: string;
	};

	let { children, class: className }: Props = $props();
</script>

<div class={cn("border-border bg-card overflow-hidden rounded-lg border", className)}>
	{@render children()}
</div>
