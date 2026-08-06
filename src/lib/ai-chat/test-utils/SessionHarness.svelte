<script lang="ts">
	import {
		createAiChatSession,
		type AiChatSession,
		type CreateAiChatSessionOptions
	} from "../session/create-session.svelte.js";

	type Props = {
		options?: CreateAiChatSessionOptions;
		onSession?: (session: AiChatSession) => void;
	};

	let { options = {}, onSession }: Props = $props();

	$effect(() => {
		const session = createAiChatSession(options);
		onSession?.(session);
	});
</script>
