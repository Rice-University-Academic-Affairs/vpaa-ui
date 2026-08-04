<script lang="ts">
	import * as ScrollArea from "$lib/components/ui/scroll-area/index.js";
	import { cn } from "$lib/utils.js";
	import type { AiChatMessage as AiChatMessageData } from "$lib/types/chat.js";
	import AiChatMessage from "./AiChatMessage.svelte";
	import AiChatEmptyState from "./AiChatEmptyState.svelte";

	type Props = {
		messages: readonly AiChatMessageData[];
		class?: string;
	};

	let { messages, class: className }: Props = $props();
</script>

<ScrollArea.Root class={cn("flex-1", className)}>
	<div class="flex flex-col gap-5 px-6 py-6">
		{#if messages.length === 0}
			<AiChatEmptyState />
		{:else}
			{#each messages as message (message.id)}
				<AiChatMessage {message} />
			{/each}
		{/if}
	</div>
</ScrollArea.Root>
