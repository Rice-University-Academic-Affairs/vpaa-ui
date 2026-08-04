<script lang="ts">
	import Sparkles from "@lucide/svelte/icons/sparkles";
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
	<div
		class="flex size-14 items-center justify-center rounded-full bg-tint-info-bg text-strong"
		aria-hidden="true"
	>
		<Sparkles class="size-6" />
	</div>
	<div class="flex max-w-sm flex-col gap-2">
		<p class="text-base font-semibold text-strong">How can I help?</p>
		<p class="text-sm leading-relaxed text-muted-foreground">
			Ask a question about your data, reports, or anything else you need help with.
		</p>
	</div>
</div>
