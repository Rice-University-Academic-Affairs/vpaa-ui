<script lang="ts">
	import { createAiChat } from "$lib/ai-chat/create-ai-chat.svelte.js";
	import type { AppShellChat } from "$lib/types/chat.js";
	import AiChatPanel from "./AiChatPanel.svelte";
	import AiChatTrigger from "./AiChatTrigger.svelte";
	import { onDestroy } from "svelte";

	type Props = {
		config: AppShellChat;
		variant?: "default" | "header";
	};

	let { config, variant = "default" }: Props = $props();

	let open = $state(false);

	const ownsChat = !config.chat;
	const chat = config.chat ?? createAiChat({ endpoint: config.endpoint ?? "/api/chat" });

	onDestroy(() => {
		if (ownsChat) {
			chat.stop();
		}
	});
</script>

<AiChatTrigger {variant} expanded={open} onclick={() => (open = true)} />

<AiChatPanel
	bind:open
	{chat}
	threads={config.threads ?? []}
	selectedThreadId={config.selectedThreadId}
	onThreadSelect={config.onThreadSelect}
	onNewThread={config.onNewThread}
/>
