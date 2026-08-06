import { createChatRouteHandler } from "$lib/ai-chat/server/create-chat-route-handler.js";
import { createMockChatStream } from "./mock-stream.js";
import { serverTools } from "./tools.js";

export const POST = createChatRouteHandler({
	serverTools,
	createStream: (context) =>
		createMockChatStream({
			messages: context.messages,
			threadId: context.threadId,
			runId: context.runId,
			tools: context.allTools,
			resume: context.resume
		})
});
