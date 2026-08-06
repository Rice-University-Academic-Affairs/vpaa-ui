<script lang="ts">
	import {
		createAiChatSession,
		type AiChatSession,
		type CreateAiChatSessionOptions
	} from "../create-ai-chat-session.svelte.js";

	type Props = {
		options?: CreateAiChatSessionOptions;
		onSession?: (session: AiChatSession) => void;
	};

	let { options = {}, onSession }: Props = $props();

	const session = createAiChatSession(options);
	onSession?.(session);
</script>
