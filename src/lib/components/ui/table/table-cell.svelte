<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLTdAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLTdAttributes> = $props();
</script>

<td bind:this={ref} data-slot="table-cell" class={cn("text-foreground px-3 py-3 align-middle text-[13px] whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)} {...restProps}>
	{@render children?.()}
</td>
