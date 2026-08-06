import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { openaiText } from "@tanstack/ai-openai";
import { env } from "$env/dynamic/private";
import { createMockChatStream } from "./mock-stream.js";
import type { RequestHandler } from "./$types.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	try {
		if (env.OPENAI_API_KEY) {
			const stream = chat({
				adapter: openaiText("gpt-4o-mini"),
				messages: body.messages
			});

			return toServerSentEventsResponse(stream);
		}

		return toServerSentEventsResponse(createMockChatStream(body));
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "An error occurred"
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" }
			}
		);
	}
};
