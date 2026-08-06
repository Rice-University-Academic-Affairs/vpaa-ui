<script lang="ts">
	import type { AiChatThread } from "$lib/types/chat.js";
	import { cn } from "$lib/utils.js";
	import Trash2 from "@lucide/svelte/icons/trash-2";

	type Props = {
		thread: AiChatThread;
		selected?: boolean;
		onselect?: () => void;
		ondelete?: () => void;
	};

	let { thread, selected = false, onselect, ondelete }: Props = $props();
</script>

<div
	class={cn(
		"group flex items-start gap-1 rounded-lg transition-colors",
		selected ? "bg-tint-navy-bg" : "hover:bg-muted"
	)}
>
	<button
		type="button"
		class={cn(
			"flex min-w-0 flex-1 flex-col gap-1 px-3 py-3 text-left",
			selected ? "text-strong" : "text-body focus-visible:outline-none"
		)}
		onclick={onselect}
	>
		<span class="line-clamp-2 text-sm font-medium leading-snug">{thread.title}</span>
		{#if thread.preview}
			<span class="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{thread.preview}</span>
		{/if}
	</button>
	<button
		type="button"
		class="text-muted-foreground hover:text-destructive mt-2 me-2 shrink-0 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
		aria-label={`Delete ${thread.title}`}
		onclick={(event) => {
			event.stopPropagation();
			ondelete?.();
		}}
	>
		<Trash2 class="size-4" />
	</button>
</div>
