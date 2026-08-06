<script lang="ts">
	import type { UIMessage } from "@tanstack/ai-client";
	import { cn } from "$lib/utils.js";

	type Props = {
		message: UIMessage;
		class?: string;
	};

	let { message, class: className }: Props = $props();

	const isUser = $derived(message.role === "user");
</script>

<div class={cn("flex w-full", isUser ? "justify-end" : "justify-start", className)}>
	<div
		class={cn(
			"max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed",
			isUser
				? "bg-primary text-primary-foreground"
				: "border border-border bg-card text-body"
		)}
	>
		{#each message.parts as part, index (index)}
			{#if part.type === "text"}
				<p class="whitespace-pre-wrap">{part.content}</p>
			{:else if part.type === "thinking"}
				<p class="text-[13px] text-muted-foreground italic">{part.content}</p>
			{:else if part.type === "tool-call"}
				<p class="text-[13px] text-muted-foreground">
					Used tool: {part.name}
					{#if part.state === "complete"}
						<span class="text-body"> (complete)</span>
					{/if}
				</p>
			{/if}
		{/each}
	</div>
</div>
