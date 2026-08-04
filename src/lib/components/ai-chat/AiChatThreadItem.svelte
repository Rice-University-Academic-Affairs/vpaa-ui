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
		"flex w-full flex-col gap-1 rounded-lg px-3 py-3 text-left transition-colors",
		selected
			? "bg-tint-navy-bg text-strong"
			: "text-body hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
	)}
	{onclick}
>
	<span class="line-clamp-2 text-sm font-medium leading-snug">{thread.title}</span>
	{#if thread.preview}
		<span class="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{thread.preview}</span>
	{/if}
</button>
