<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { AppNavIcon } from "$lib/types/navigation.js";

	type Props = {
		href: string;
		label: string;
		icon?: AppNavIcon;
		active?: boolean;
		disabled?: boolean;
		badge?: string;
		onclick?: () => void;
	};

	let { href, label, icon: Icon, active = false, disabled = false, badge, onclick }: Props =
		$props();
</script>

{#if disabled}
	<span
		aria-disabled="true"
		class="pointer-events-none flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground opacity-50"
	>
		{#if Icon}
			<Icon class="size-4 shrink-0" />
		{/if}
		<span>{label}</span>
		{#if badge}
			<span class="ms-auto font-mono text-[10px]">{badge}</span>
		{/if}
	</span>
{:else}
	<a
		{href}
		{onclick}
		aria-current={active ? "page" : undefined}
		class={cn(
			"flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
			active
				? "bg-tint-navy-bg font-medium text-strong"
				: "text-muted-foreground hover:bg-[var(--gray-150)] hover:text-body"
		)}
	>
		{#if Icon}
			<Icon class="size-4 shrink-0" />
		{/if}
		<span>{label}</span>
		{#if badge}
			<span class="ms-auto font-mono text-[10px]">{badge}</span>
		{/if}
	</a>
{/if}
