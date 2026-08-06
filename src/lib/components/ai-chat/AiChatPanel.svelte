<script lang="ts">
	import type { AiChatSession } from "$lib/ai-chat/session/create-session.svelte.js";
	import * as Sheet from "$lib/components/ui/sheet/index.js";
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import AiChatThreadList from "./AiChatThreadList.svelte";
	import AiChatView from "./AiChatView.svelte";

	type Props = {
		open?: boolean;
		session: AiChatSession;
	};

	let { open = $bindable(false), session }: Props = $props();
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
				threads={session.threads}
				selectedThreadId={session.selectedThreadId}
				onThreadSelect={(threadId) => void session.selectThread(threadId)}
				onThreadDelete={(threadId) => void session.deleteThread(threadId)}
				onNewThread={() => void session.createThread()}
			/>
			<AiChatView
				chat={session.chat}
				thread={session.selectedThread}
				isReady={session.isReady}
				bootstrapError={session.bootstrapError}
			/>
		</div>
	</Sheet.Content>
</Sheet.Root>
