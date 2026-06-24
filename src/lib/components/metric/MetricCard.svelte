<script lang="ts">
	import { cn } from "$lib/utils.js";

	type Props = {
		label: string;
		value: string | number;
		variant?: "default" | "highlight";
		class?: string;
	};

	let { label, value, variant = "default", class: className }: Props = $props();
</script>

<div class={cn(variant === "highlight" ? "panel-highlight" : "panel", className)}>
	<p class="label" class:opacity-80={variant === "highlight"}>{label}</p>
	<p class="number">{value}</p>
</div>
