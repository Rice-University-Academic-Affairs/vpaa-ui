<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import { onMount } from "svelte";

	type Props = {
		children: Snippet;
		width?: "normal" | "wide" | "full";
		class?: string;
		"data-app-ready"?: boolean;
	};

	let { children, width = "wide", class: className, "data-app-ready": appReady }: Props = $props();

	let hydrated = $state(false);

	onMount(() => {
		hydrated = true;
	});

	const widthClass = $derived(
		({ normal: "max-w-5xl", wide: "max-w-7xl", full: "max-w-none" } as const)[width]
	);
</script>

<div
	class={cn("mx-auto w-full p-4 md:p-6", widthClass, className)}
	data-app-ready={appReady ? "" : undefined}
	data-hydrated={hydrated ? "" : undefined}
>
	{@render children()}
</div>
