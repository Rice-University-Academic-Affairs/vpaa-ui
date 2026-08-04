<script lang="ts">
	import Sparkles from "@lucide/svelte/icons/sparkles";
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
	<div
		class="flex size-12 items-center justify-center rounded-full bg-tint-info-bg text-strong"
		aria-hidden="true"
	>
		<Sparkles class="size-5" />
	</div>
	<div class="flex flex-col gap-1">
		<p class="font-semibold text-strong">How can I help?</p>
		<p class="caption max-w-xs">
			Ask a question about your data, reports, or anything else you need help with.
		</p>
	</div>
</div>
