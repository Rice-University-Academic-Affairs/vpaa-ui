<script lang="ts" generics="T">
	import SearchIcon from "@lucide/svelte/icons/search";
	import { Input } from "$lib/components/ui/input/index.js";
	import { cn } from "$lib/utils.js";

	type Props<T> = {
		items: T[];
		field: keyof T & string;
		secondaryField?: keyof T & string;
		onSelect: (item: T) => void;
		placeholder?: string;
		variant?: "default" | "header";
		class?: string;
	};

	let {
		items,
		field,
		secondaryField,
		onSelect,
		placeholder = "Search…",
		variant = "default",
		class: className
	}: Props<T> = $props();

	let open = $state(false);
	let query = $state("");
	let inputRef = $state<HTMLInputElement | null>(null);
	let rootRef = $state<HTMLDivElement | null>(null);

	const trimmedQuery = $derived(query.trim());
	const matches = $derived(
		trimmedQuery
			? items.filter((item) =>
					String(item[field]).toLowerCase().includes(trimmedQuery.toLowerCase())
				)
			: []
	);
	const hasMatches = $derived(matches.length > 0);
	const isHeader = $derived(variant === "header");

	function splitMatch(
		text: string,
		q: string
	): { before: string; match: string; after: string } | null {
		if (!q) return null;
		const index = text.toLowerCase().indexOf(q.toLowerCase());
		if (index === -1) return null;
		return {
			before: text.slice(0, index),
			match: text.slice(index, index + q.length),
			after: text.slice(index + q.length)
		};
	}

	function close() {
		open = false;
		query = "";
	}

	function selectItem(item: T) {
		onSelect(item);
		close();
	}

	function handleDocumentClick(event: MouseEvent) {
		if (!open || !rootRef) return;
		if (!rootRef.contains(event.target as Node)) {
			close();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && open) {
			event.preventDefault();
			close();
		}
	}

	$effect(() => {
		if (open) {
			queueMicrotask(() => inputRef?.focus());
			document.addEventListener("click", handleDocumentClick, true);
			document.addEventListener("keydown", handleKeydown);
			return () => {
				document.removeEventListener("click", handleDocumentClick, true);
				document.removeEventListener("keydown", handleKeydown);
			};
		}
	});
</script>

<div bind:this={rootRef} class={cn("relative", className)}>
	{#if !open}
		<button
			type="button"
			class={cn(
				"flex size-8 items-center justify-center rounded-full",
				isHeader
					? "border-transparent bg-transparent text-[var(--text-on-navy)] hover:bg-white/10"
					: "border-border bg-background hover:bg-muted border"
			)}
			aria-label="Search"
			onclick={() => (open = true)}
		>
			<SearchIcon class="size-4" />
		</button>
	{:else}
		<Input
			bind:ref={inputRef}
			class={cn(
				"h-8 w-64",
				isHeader &&
					"rounded-lg border border-[var(--border-hairline)] bg-white text-body placeholder:text-muted-foreground focus-visible:ring-[var(--focus-ring)]",
				isHeader && hasMatches && "rounded-b-none"
			)}
			{placeholder}
			bind:value={query}
		/>
		{#if hasMatches}
			<div
				class={cn(
					"absolute top-full z-10 max-h-60 w-64 overflow-y-auto p-1",
					isHeader
						? "mt-0 rounded-lg rounded-t-none border border-t-0 border-[var(--border-hairline)] bg-white shadow-md"
						: "panel mt-1"
				)}
			>
				{#each matches as item, index (index)}
					<button
						type="button"
						class={cn(
							"w-full rounded-md px-2 py-1.5 text-left text-[13px]",
							isHeader
								? "text-body hover:bg-[var(--gray-50)] focus-visible:bg-tint-navy-bg focus-visible:outline-none"
								: "hover:bg-muted"
						)}
						onclick={() => selectItem(item)}
					>
						{#if isHeader}
							{@const parts = splitMatch(String(item[field]), trimmedQuery)}
							{#if parts}
								<span class="text-body">{parts.before}</span><span
									class="font-semibold text-strong">{parts.match}</span
								><span class="text-body">{parts.after}</span>
							{:else}
								<span class="text-body">{String(item[field])}</span>
							{/if}
						{:else}
							{String(item[field])}
						{/if}
						{#if secondaryField}
							<span class="block text-[12px] text-muted-foreground"
								>{String(item[secondaryField])}</span
							>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>
