<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import type { ComponentProps, Snippet } from "svelte";

	type Props = Omit<ComponentProps<typeof Button>, "variant"> & {
		children?: Snippet;
	};

	let { children, ...restProps }: Props = $props();
</script>

<Button variant="default" {...restProps}>
	{@render children?.()}
</Button>
