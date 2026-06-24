<script lang="ts">
	import type { AppNavGroup } from "$lib/types/navigation.js";
	import { isNavItemActive } from "$lib/types/navigation.js";
	import NavItem from "./NavItem.svelte";

	type Props = {
		navigation: AppNavGroup[];
		currentPath?: string;
		onNavigate?: () => void;
	};

	let { navigation, currentPath = "", onNavigate }: Props = $props();
</script>

<div class="flex flex-col gap-1 p-2">
	{#each navigation as group (group.label ?? group.items[0]?.href)}
		{#if group.label}
			<p class="px-2 py-1 text-xs font-medium text-muted-foreground">{group.label}</p>
		{/if}
		<ul class="flex flex-col gap-0.5">
			{#each group.items as item (item.href)}
				<li>
					<NavItem
						href={item.href}
						label={item.label}
						icon={item.icon}
						active={isNavItemActive(item.href, currentPath, item.exact)}
						disabled={item.disabled}
						badge={item.badge}
						onclick={onNavigate}
					/>
				</li>
			{/each}
		</ul>
	{/each}
</div>
