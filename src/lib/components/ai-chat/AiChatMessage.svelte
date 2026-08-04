<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { AiChatMessage } from "$lib/types/chat.js";

	type Props = {
		message: AiChatMessage;
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
		<p class="whitespace-pre-wrap">{message.content}</p>
	</div>
</div>
