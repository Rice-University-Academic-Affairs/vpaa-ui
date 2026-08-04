<script lang="ts">
	import type { AiChatMessage, AiChatThread } from "$lib/types/chat.js";
	import AiChatPanel from "./AiChatPanel.svelte";
	import AiChatTrigger from "./AiChatTrigger.svelte";

	type Props = {
		threads: readonly AiChatThread[];
		messages?: readonly AiChatMessage[];
		selectedThreadId?: string | null;
		onThreadSelect?: (threadId: string) => void;
		onNewThread?: () => void;
		onSendMessage?: (message: string) => void;
		variant?: "default" | "header";
	};

	let {
		threads,
		messages = [],
		selectedThreadId = null,
		onThreadSelect,
		onNewThread,
		onSendMessage,
		variant = "default"
	}: Props = $props();

	let open = $state(false);
</script>

<AiChatTrigger {variant} expanded={open} onclick={() => (open = true)} />

<AiChatPanel
	bind:open
	{threads}
	{messages}
	{selectedThreadId}
	{onThreadSelect}
	{onNewThread}
	{onSendMessage}
/>
