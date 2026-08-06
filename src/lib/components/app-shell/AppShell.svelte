<script lang="ts">
	import * as Sheet from "$lib/components/ui/sheet/index.js";
	import { createAiChat } from "$lib/ai-chat/create-ai-chat.svelte.js";
	import AiChatPanel from "$lib/components/ai-chat/AiChatPanel.svelte";
	import type { AppNavGroup } from "$lib/types/navigation.js";
	import type { AppShellChat, AppShellSearch, AppShellUser } from "$lib/types/shell.js";
	import type { Snippet } from "svelte";
	import { onDestroy } from "svelte";
	import AppNavContent from "./AppNavContent.svelte";
	import AppSidebar from "./AppSidebar.svelte";
	import AppTopBar from "./AppTopBar.svelte";

	type Props = {
		appName: string;
		navigation: AppNavGroup[];
		currentPath?: string;
		user?: AppShellUser;
		search?: AppShellSearch;
		chat?: AppShellChat;
		children: Snippet;
	};

	let { appName, navigation, currentPath, user, search, chat, children }: Props = $props();

	let mobileNavOpen = $state(false);
	let chatOpen = $state(false);

	const ownsChat = !chat?.chat;
	const chatClient = chat?.chat ?? createAiChat({ endpoint: chat?.endpoint ?? "/api/chat" });

	onDestroy(() => {
		if (ownsChat) {
			chatClient.stop();
		}
	});
</script>

<div class="app-shell">
	<AppTopBar
		{appName}
		{user}
		{search}
		{chat}
		{chatClient}
		chatOpen={chatOpen}
		onChatOpen={() => (chatOpen = true)}
		onMenuClick={() => (mobileNavOpen = true)}
	/>
	<AppSidebar {navigation} {currentPath} />
	<Sheet.Root bind:open={mobileNavOpen}>
		<Sheet.Content side="left" class="w-[248px] p-0 sm:max-w-[248px] motion-reduce:transition-none">
			<nav aria-label="Primary" class="pt-2">
				<AppNavContent
					{navigation}
					{currentPath}
					onNavigate={() => (mobileNavOpen = false)}
				/>
			</nav>
		</Sheet.Content>
	</Sheet.Root>
	{#if chat}
		<AiChatPanel
			bind:open={chatOpen}
			chat={chatClient}
			threads={chat.threads ?? []}
			selectedThreadId={chat.selectedThreadId}
			onThreadSelect={chat.onThreadSelect}
			onNewThread={chat.onNewThread}
		/>
	{/if}
	<main class="overflow-y-auto" style="grid-area: content;">
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		display: grid;
		grid-template-columns: 248px 1fr;
		grid-template-rows: 64px 1fr;
		grid-template-areas:
			"topbar topbar"
			"sidebar content";
		height: 100dvh;
	}

	@media (max-width: 767px) {
		.app-shell {
			grid-template-columns: 1fr;
			grid-template-areas:
				"topbar"
				"content";
		}
	}
</style>
