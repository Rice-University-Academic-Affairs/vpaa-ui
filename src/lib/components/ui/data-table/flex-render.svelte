<script
	lang="ts"
	generics="TData, TValue, TContext extends HeaderContext<TData, TValue> | CellContext<TData, TValue>"
>
	import type { CellContext, ColumnDefTemplate, HeaderContext } from "@tanstack/table-core";
	import { RenderSnippetConfig } from "./render-helpers.js";
	import type { Attachment } from "svelte/attachments";
	type Props = {
		content?: TContext extends HeaderContext<TData, TValue>
			? ColumnDefTemplate<HeaderContext<TData, TValue>>
			: TContext extends CellContext<TData, TValue>
				? ColumnDefTemplate<CellContext<TData, TValue>>
				: never;
		context: TContext;
		attach?: Attachment;
	};

	let { content, context, attach }: Props = $props();
</script>

{#if typeof content === "string"}
	{content}
{:else if content instanceof Function}
	<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
	{@const result = content(context as any)}
	{#if result instanceof RenderSnippetConfig}
		{@const { snippet, params } = result}
		{@render snippet({ ...params, attach })}
	{:else}
		{result}
	{/if}
{/if}
