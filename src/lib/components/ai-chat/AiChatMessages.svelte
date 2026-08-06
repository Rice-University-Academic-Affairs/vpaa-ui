<script lang="ts">
	import type { UIMessage } from "@tanstack/ai-client";
	import * as ScrollArea from "$lib/components/ui/scroll-area/index.js";
	import { cn } from "$lib/utils.js";
	import AiChatMessage from "./AiChatMessage.svelte";
	import AiChatEmptyState from "./AiChatEmptyState.svelte";

	type Props = {
		messages: readonly UIMessage[];
		isLoading?: boolean;
		class?: string;
	};

	let { messages, isLoading = false, class: className }: Props = $props();
</script>

<ScrollArea.Root class={cn("flex-1", className)}>
	<div class="flex flex-col gap-5 px-6 py-6">
		{#if messages.length === 0 && !isLoading}
			<AiChatEmptyState />
		{:else}
			{#each messages as message (message.id)}
				<AiChatMessage {message} />
			{/each}
			{#if isLoading}
				<div class="flex justify-start">
					<div class="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
						Thinking…
					</div>
				</div>
			{/if}
		{/if}
	</div>
</ScrollArea.Root>
