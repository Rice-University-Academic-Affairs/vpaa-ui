<script lang="ts">
	import type { AiChatClient } from "$lib/ai-chat/create-ai-chat.svelte.js";
	import * as Sheet from "$lib/components/ui/sheet/index.js";
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import type { AiChatThread } from "$lib/types/chat.js";
	import AiChatThreadList from "./AiChatThreadList.svelte";
	import AiChatView from "./AiChatView.svelte";

	type Props = {
		open?: boolean;
		chat: AiChatClient;
		threads?: readonly AiChatThread[];
		selectedThreadId?: string | null;
		onThreadSelect?: (threadId: string) => void;
		onNewThread?: () => void;
	};

	let {
		open = $bindable(false),
		chat,
		threads = [],
		selectedThreadId = null,
		onThreadSelect,
		onNewThread
	}: Props = $props();

	const selectedThread = $derived(
		threads.find((thread) => thread.id === selectedThreadId) ?? null
	);

	function handleThreadSelect(threadId: string) {
		chat.clear();
		onThreadSelect?.(threadId);
	}

	function handleNewThread() {
		chat.clear();
		onNewThread?.();
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content
		side="right"
		class="flex h-full w-full max-w-full flex-col gap-0 p-0 motion-reduce:transition-none data-[side=right]:w-full data-[side=right]:max-w-full sm:data-[side=right]:w-[40vw] sm:data-[side=right]:min-w-[520px] sm:data-[side=right]:max-w-[40vw]"
	>
		<Sheet.Header class="shrink-0 border-b border-border px-6 py-4">
			<div class="flex items-center gap-2.5 pe-10">
				<Sparkles class="size-5 text-primary" />
				<Sheet.Title class="text-base font-semibold">AI Assistant</Sheet.Title>
			</div>
			<Sheet.Description class="sr-only">
				Chat with the AI assistant about your data and reports.
			</Sheet.Description>
		</Sheet.Header>

		<div class="flex min-h-0 flex-1 overflow-hidden">
			<AiChatThreadList
				{threads}
				{selectedThreadId}
				onThreadSelect={handleThreadSelect}
				onNewThread={handleNewThread}
			/>
			<AiChatView {chat} thread={selectedThread} />
		</div>
	</Sheet.Content>
</Sheet.Root>
