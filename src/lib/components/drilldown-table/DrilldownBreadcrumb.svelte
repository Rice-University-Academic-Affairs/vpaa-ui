<script lang="ts">
	type Crumb = {
		label: string;
		onClick: (() => void) | null;
	};

	type Props = {
		crumbs: Crumb[];
	};

	let { crumbs }: Props = $props();

	const backOnClick = $derived(
		crumbs.length > 1 ? (crumbs[crumbs.length - 2]?.onClick ?? null) : null
	);
</script>

<nav
	aria-label="Drilldown navigation"
	class="border-border flex items-center gap-2 border-b px-3 py-2.5"
>
	{#if backOnClick}
		<button
			type="button"
			class="text-muted-foreground hover:text-foreground focus-visible:ring-[var(--focus-ring)] rounded-sm outline-none focus-visible:ring-2"
			aria-label="Back"
			onclick={backOnClick}
		>
			←
		</button>
	{/if}
	<ol class="flex min-w-0 flex-wrap items-center gap-1">
		{#each crumbs as crumb, index (index)}
			{#if index > 0}
				<li class="caption" aria-hidden="true">›</li>
			{/if}
			<li class="min-w-0">
				{#if crumb.onClick}
					<button
						type="button"
						class="caption hover:text-foreground focus-visible:ring-[var(--focus-ring)] truncate rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2"
						onclick={crumb.onClick}
					>
						{crumb.label}
					</button>
				{:else}
					<span class="text-strong truncate font-semibold" aria-current="page">{crumb.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
