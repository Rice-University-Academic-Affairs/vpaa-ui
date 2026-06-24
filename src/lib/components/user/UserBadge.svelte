<script lang="ts">
	import { cn } from "$lib/utils.js";

	type Props = {
		name: string;
		variant?: "default" | "header";
		class?: string;
	};

	let { name, variant = "default", class: className }: Props = $props();

	const initial = $derived(name.trim().charAt(0).toUpperCase() || "?");
</script>

<div class={cn("flex items-center gap-2", className)}>
	<span
		class={cn(
			"flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
			variant === "header"
				? "bg-white/15 text-[var(--text-on-navy)]"
				: "bg-tint-info-bg text-strong"
		)}
		aria-hidden="true"
	>
		{initial}
	</span>
	<span
		class={cn(
			"truncate font-semibold",
			variant === "header" ? "hidden text-[var(--text-on-navy)] sm:inline" : "text-strong"
		)}
	>
		{name}
	</span>
</div>
