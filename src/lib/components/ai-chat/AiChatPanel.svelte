<script lang="ts">
	import * as Sheet from "$lib/components/ui/sheet/index.js";
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import type { AiChatMessage, AiChatThread } from "$lib/types/chat.js";
	import AiChatThreadList from "./AiChatThreadList.svelte";
	import AiChatView from "./AiChatView.svelte";

	type Props = {
		open?: boolean;
		threads: readonly AiChatThread[];
		messages?: readonly AiChatMessage[];
		selectedThreadId?: string | null;
		onThreadSelect?: (threadId: string) => void;
		onNewThread?: () => void;
		onSendMessage?: (message: string) => void;
	};

	let {
		open = $bindable(false),
		threads,
		messages = [],
		selectedThreadId = null,
		onThreadSelect,
		onNewThread,
		onSendMessage
	}: Props = $props();

	const selectedThread = $derived(
		threads.find((thread) => thread.id === selectedThreadId) ?? null
	);
</script>

<Sheet.Root bind:open>
	<Sheet.Content
		side="right"
		class="flex w-full flex-col gap-0 p-0 sm:w-1/2 sm:max-w-none motion-reduce:transition-none"
	>
		<Sheet.Header class="shrink-0 border-b border-border px-5 py-4">
			<div class="flex items-center gap-2">
				<Sparkles class="size-4 text-primary" />
				<Sheet.Title>AI Assistant</Sheet.Title>
			</div>
			<Sheet.Description class="sr-only">
				Chat with the AI assistant about your data and reports.
			</Sheet.Description>
		</Sheet.Header>

		<div class="flex min-h-0 flex-1 overflow-hidden">
			<AiChatThreadList
				{threads}
				{selectedThreadId}
				{onThreadSelect}
				{onNewThread}
			/>
			<AiChatView
				thread={selectedThread}
				{messages}
				{onSendMessage}
			/>
		</div>
	</Sheet.Content>
</Sheet.Root>
