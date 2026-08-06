<script lang="ts">
	import type { AiChatSession } from "$lib/ai-chat/session/create-session.svelte.js";
	import AiChatPanel from "./AiChatPanel.svelte";
	import AiChatTrigger from "./AiChatTrigger.svelte";
	import { onDestroy } from "svelte";

	type Props = {
		session: AiChatSession;
		variant?: "default" | "header";
	};

	let { session, variant = "default" }: Props = $props();

	let open = $state(false);

	onDestroy(() => {
		session.dispose();
	});
</script>

<AiChatTrigger {variant} expanded={open} onclick={() => (open = true)} />

<AiChatPanel bind:open {session} />
