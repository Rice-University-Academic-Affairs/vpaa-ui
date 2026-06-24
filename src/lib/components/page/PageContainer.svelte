<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	type Props = {
		children: Snippet;
		width?: "normal" | "wide" | "full";
		class?: string;
	};

	let { children, width = "wide", class: className }: Props = $props();

	const widthClass = $derived(
		({ normal: "max-w-5xl", wide: "max-w-7xl", full: "max-w-none" } as const)[width]
	);
</script>

<div class={cn("mx-auto w-full p-4 md:p-6", widthClass, className)}>
	{@render children()}
</div>
