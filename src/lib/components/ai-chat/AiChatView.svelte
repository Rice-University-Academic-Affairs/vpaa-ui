<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { AiChatMessage, AiChatThread } from "$lib/types/chat.js";
	import AiChatMessages from "./AiChatMessages.svelte";
	import AiChatInput from "./AiChatInput.svelte";

	type Props = {
		thread?: AiChatThread | null;
		messages: readonly AiChatMessage[];
		onSendMessage?: (message: string) => void;
		class?: string;
	};

	let { thread = null, messages, onSendMessage, class: className }: Props = $props();
</script>

<section class={cn("flex min-w-0 flex-1 flex-col", className)}>
	{#if thread}
		<header class="flex shrink-0 items-center border-b border-border px-4 py-3">
			<h2 class="truncate text-[13px] font-semibold text-strong">{thread.title}</h2>
		</header>
	{/if}

	<AiChatMessages {messages} />

	<AiChatInput onSubmit={onSendMessage} />
</section>
