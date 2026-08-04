<script lang="ts">
	import AiChat from "$lib/components/ai-chat/AiChat.svelte";
	import Search from "$lib/components/search/Search.svelte";
	import UserBadge from "$lib/components/user/UserBadge.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import Menu from "@lucide/svelte/icons/menu";
	import type { AppShellChat, AppShellSearch, AppShellUser } from "$lib/types/shell.js";

	type Props = {
		appName: string;
		user?: AppShellUser;
		search?: AppShellSearch;
		chat?: AppShellChat;
		onMenuClick?: () => void;
	};

	let { appName, user, search, chat, onMenuClick }: Props = $props();
</script>

<header
	class="flex h-16 shrink-0 items-center gap-3 bg-[var(--surface-header)] px-5"
	style="grid-area: topbar;"
>
	<div class="flex min-w-0 items-center gap-2">
		{#if onMenuClick}
			<Button
				variant="ghost"
				size="icon"
				class="text-[var(--text-on-navy)] hover:bg-white/10 focus-visible:ring-white/60 md:hidden"
				onclick={onMenuClick}
				aria-label="Open navigation menu"
			>
				<Menu />
			</Button>
		{/if}
		<a
			href="/"
			class="truncate rounded-sm text-xl font-bold text-[var(--text-on-navy)] outline-none focus-visible:ring-2 focus-visible:ring-white/60"
		>
			{appName}
		</a>
	</div>

	<div class="ms-auto flex items-center gap-4">
		{#if search}
			<Search
				variant="header"
				items={search.items as Record<string, unknown>[]}
				field={search.field}
				secondaryField={search.secondaryField}
				onSelect={(item) => search.onSelect(item)}
				placeholder={search.placeholder}
			/>
		{/if}
		{#if chat}
			<AiChat
				variant="header"
				threads={chat.threads}
				messages={chat.messages}
				selectedThreadId={chat.selectedThreadId}
				onThreadSelect={chat.onThreadSelect}
				onNewThread={chat.onNewThread}
				onSendMessage={chat.onSendMessage}
			/>
		{/if}
		{#if user}
			<UserBadge variant="header" name={user.name} />
		{/if}
	</div>
</header>
