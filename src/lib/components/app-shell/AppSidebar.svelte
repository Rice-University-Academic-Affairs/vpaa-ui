<script lang="ts">
	import type { AppNavGroup } from "$lib/types/navigation.js";
	import AppNavContent from "./AppNavContent.svelte";

	type Props = {
		navigation: AppNavGroup[];
		currentPath?: string;
	};

	let { navigation, currentPath = "" }: Props = $props();
</script>

<nav
	aria-label="Primary"
	class="hidden overflow-y-auto border-r border-[var(--border-hairline)] bg-white md:block"
	style="grid-area: sidebar;"
>
	<AppNavContent {navigation} {currentPath} />
</nav>
