<script lang="ts">
	import type { UIMessage } from "@tanstack/ai-client";
	import * as ScrollArea from "$lib/components/ui/scroll-area/index.js";
	import { cn } from "$lib/utils.js";
	import AiChatMessage from "./AiChatMessage.svelte";
	import AiChatEmptyState from "./AiChatEmptyState.svelte";
	import AiChatLoadingIndicator from "./AiChatLoadingIndicator.svelte";
	import { scrollMessagesToBottom } from "./scroll-messages-to-bottom.js";

	type Props = {
		messages: readonly UIMessage[];
		isLoading?: boolean;
		class?: string;
	};

	let { messages, isLoading = false, class: className }: Props = $props();

	let viewport = $state<HTMLElement | null>(null);

	$effect(() => {
		messages.length;
		isLoading;
		scrollMessagesToBottom(viewport);
	});
</script>

<ScrollArea.Root bind:viewportRef={viewport} class={cn("flex-1", className)}>
	<div class="flex flex-col gap-5 px-6 py-6">
		{#if messages.length === 0 && !isLoading}
			<AiChatEmptyState />
		{:else}
			{#each messages as message (message.id)}
				<AiChatMessage {message} />
			{/each}
			{#if isLoading}
				<AiChatLoadingIndicator />
			{/if}
		{/if}
	</div>
</ScrollArea.Root>
