import type { Snippet } from "svelte";

export class RenderSnippetConfig<TProps> {
	snippet: Snippet<[TProps]>;
	params: TProps;
	constructor(snippet: Snippet<[TProps]>, params: TProps) {
		this.snippet = snippet;
		this.params = params;
	}
}

export function renderSnippet<TProps>(snippet: Snippet<[TProps]>, params: TProps = {} as TProps) {
	return new RenderSnippetConfig(snippet, params);
}
