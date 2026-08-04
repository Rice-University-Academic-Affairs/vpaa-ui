<script lang="ts">
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import { cn } from "$lib/utils.js";
	import type { AiChatMessage, AiChatThread } from "$lib/types/chat.js";
	import AiChatPanel from "./AiChatPanel.svelte";

	type Props = {
		threads: readonly AiChatThread[];
		messages?: readonly AiChatMessage[];
		selectedThreadId?: string | null;
		onThreadSelect?: (threadId: string) => void;
		onNewThread?: () => void;
		onSendMessage?: (message: string) => void;
		variant?: "default" | "header";
		class?: string;
	};

	let {
		threads,
		messages = [],
		selectedThreadId = null,
		onThreadSelect,
		onNewThread,
		onSendMessage,
		variant = "default",
		class: className
	}: Props = $props();

	let open = $state(false);
	const isHeader = $derived(variant === "header");
</script>

<div class={cn("relative", className)}>
	<button
		type="button"
		class={cn(
			"flex size-8 items-center justify-center rounded-full",
			isHeader
				? "border-transparent bg-transparent text-[var(--text-on-navy)] hover:bg-white/10"
				: "border-border bg-background hover:bg-muted border"
		)}
		aria-label="Open AI assistant"
		aria-expanded={open}
		onclick={() => (open = true)}
	>
		<Sparkles class="size-4" />
	</button>

	<AiChatPanel
		bind:open
		{threads}
		{messages}
		{selectedThreadId}
		{onThreadSelect}
		{onNewThread}
		{onSendMessage}
	/>
</div>
