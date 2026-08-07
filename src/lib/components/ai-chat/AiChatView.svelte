<script lang="ts">
	import type { AiChatClient } from "$lib/ai-chat/client/create-chat.svelte.js";
	import { cn } from "$lib/utils.js";
	import type { AiChatThread } from "$lib/types/chat.js";
	import AiChatMessages from "./AiChatMessages.svelte";
	import AiChatInput from "./AiChatInput.svelte";
	import AiChatLoadingIndicator from "./AiChatLoadingIndicator.svelte";

	type Props = {
		chat: AiChatClient | null;
		thread?: AiChatThread | null;
		isReady?: boolean;
		bootstrapError?: Error | null;
		class?: string;
	};

	let {
		chat,
		thread = null,
		isReady = true,
		bootstrapError = null,
		class: className
	}: Props = $props();

	const isWaitingForResponse = $derived(Boolean(chat?.isLoading));
	const inputDisabled = $derived(!isReady || Boolean(bootstrapError) || isWaitingForResponse);
</script>

<section class={cn("flex min-w-0 flex-1 flex-col bg-background", className)}>
	{#if thread}
		<header class="flex shrink-0 items-center border-b border-border px-6 py-4">
			<h2 class="truncate text-sm font-semibold text-strong">{thread.title}</h2>
		</header>
	{/if}

	{#if bootstrapError}
		<div class="border-b border-destructive/20 bg-destructive/5 px-6 py-3 text-sm text-destructive">
			{bootstrapError.message}
		</div>
	{/if}

	{#if !isReady}
		<div class="flex flex-1 items-center justify-center px-6 py-8">
			<AiChatLoadingIndicator />
		</div>
	{:else if chat}
		{#if chat.error}
			<div class="border-b border-destructive/20 bg-destructive/5 px-6 py-3 text-sm text-destructive">
				{chat.error.message}
			</div>
		{/if}

		<AiChatMessages messages={chat.messages} isLoading={chat.isLoading} />

		<AiChatInput
			disabled={inputDisabled}
			onSubmit={(message) => chat.sendMessage(message)}
		/>
	{/if}
</section>
