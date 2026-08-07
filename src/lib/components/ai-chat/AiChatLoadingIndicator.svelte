<script lang="ts">
	import { cn } from "$lib/utils.js";

	type Props = {
		class?: string;
	};

	let { class: className }: Props = $props();
</script>

<div
	class={cn("flex justify-start", className)}
	role="status"
	aria-live="polite"
	aria-label="Assistant is responding"
>
	<div class="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
		Thinking…
	</div>
</div>
