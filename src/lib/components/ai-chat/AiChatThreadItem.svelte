<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { AiChatThread } from "$lib/types/chat.js";

	type Props = {
		thread: AiChatThread;
		selected?: boolean;
		onclick?: () => void;
	};

	let { thread, selected = false, onclick }: Props = $props();
</script>

<button
	type="button"
	class={cn(
		"flex w-full flex-col gap-0.5 rounded-md px-3 py-2.5 text-left transition-colors",
		selected
			? "bg-tint-navy-bg text-strong"
			: "text-body hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
	)}
	{onclick}
>
	<span class="truncate text-[13px] font-medium">{thread.title}</span>
	{#if thread.preview}
		<span class="truncate text-[12px] text-muted-foreground">{thread.preview}</span>
	{/if}
</button>
