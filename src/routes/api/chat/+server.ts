import { chatParamsFromRequest, mergeAgentTools, toServerSentEventsResponse } from "@tanstack/ai";
import { createMockChatStream } from "./mock-stream.js";
import { serverTools } from "./server-tools.js";
import type { RequestHandler } from "./$types.js";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const params = await chatParamsFromRequest(request);
		const tools = mergeAgentTools(serverTools, params.tools);

		return toServerSentEventsResponse(
			createMockChatStream({
				messages: params.messages,
				threadId: params.threadId,
				runId: params.runId,
				tools
			})
		);
	} catch (error) {
		if (error instanceof Response) {
			return error;
		}

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
