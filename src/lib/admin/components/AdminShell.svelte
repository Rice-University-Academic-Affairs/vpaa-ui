<script lang="ts">
	import type { Snippet } from "svelte";
	import { resolve } from "$app/paths";
	import { PageContainer, PageHeader } from "$lib/components/page/index.js";

	type Props = {
		title?: string;
		children: Snippet;
		actions?: Snippet;
	};

	let { title, children, actions }: Props = $props();
</script>

<PageContainer>
	<div class="mb-4">
		<a
			href={resolve("/admin")}
			class="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
			>Admin</a
		>
	</div>
	{#if title}
		<PageHeader {title} {actions} />
	{/if}
	{@render children()}
</PageContainer>
