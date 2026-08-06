import { render } from "@testing-library/svelte";
import type { AiChatSession, CreateAiChatSessionOptions } from "../create-ai-chat-session.svelte.js";
import { flushAsyncWork } from "./mock-chat-client.js";
import SessionHarness from "./SessionHarness.svelte";

export async function mountSession(
	options: CreateAiChatSessionOptions = {}
): Promise<AiChatSession> {
	let session: AiChatSession | undefined;

	render(SessionHarness, {
		props: {
			options,
			onSession: (value) => {
				session = value;
			}
		}
	});

	await flushAsyncWork();

	if (!session) {
		throw new Error("Session was not created");
	}

	return session;
}
