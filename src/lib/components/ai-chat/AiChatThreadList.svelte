<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import * as ScrollArea from "$lib/components/ui/scroll-area/index.js";
	import Plus from "@lucide/svelte/icons/plus";
	import { cn } from "$lib/utils.js";
	import type { AiChatThread } from "$lib/types/chat.js";
	import AiChatThreadItem from "./AiChatThreadItem.svelte";

	type Props = {
		threads: readonly AiChatThread[];
		selectedThreadId?: string | null;
		onThreadSelect?: (threadId: string) => void;
		onNewThread?: () => void;
		class?: string;
	};

	let {
		threads,
		selectedThreadId = null,
		onThreadSelect,
		onNewThread,
		class: className
	}: Props = $props();
</script>

<aside class={cn("flex w-48 shrink-0 flex-col border-r border-border bg-muted/30 sm:w-64", className)}>
	<div class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
		<span class="label text-muted-foreground">Threads</span>
		<Button variant="ghost" size="icon-sm" aria-label="New conversation" onclick={onNewThread}>
			<Plus data-icon="inline-start" />
		</Button>
	</div>

	<ScrollArea.Root class="flex-1">
		<div class="flex flex-col gap-0.5 p-2">
			{#if threads.length === 0}
				<p class="px-3 py-6 text-center text-[12px] text-muted-foreground">
					No conversations yet. Start a new one to get help.
				</p>
			{:else}
				{#each threads as thread (thread.id)}
					<AiChatThreadItem
						{thread}
						selected={thread.id === selectedThreadId}
						onclick={() => onThreadSelect?.(thread.id)}
					/>
				{/each}
			{/if}
		</div>
	</ScrollArea.Root>
</aside>
