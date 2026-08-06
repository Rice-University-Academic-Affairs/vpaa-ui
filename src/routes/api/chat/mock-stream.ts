import { EventType, type StreamChunk } from "@tanstack/ai";

function lastUserText(messages: Array<{ role?: string; content?: unknown }>): string {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message?.role !== "user") continue;
		if (typeof message.content === "string") return message.content;
	}
	return "";
}

export async function* createMockChatStream(
	body: Record<string, unknown>
): AsyncGenerator<StreamChunk> {
	const messages = Array.isArray(body.messages) ? body.messages : [];
	const threadId = typeof body.threadId === "string" ? body.threadId : crypto.randomUUID();
	const runId = crypto.randomUUID();
	const messageId = crypto.randomUUID();
	const userText = lastUserText(messages as Array<{ role?: string; content?: unknown }>);
	const response = userText
		? `Thanks for your question about "${userText}". This is a demo response from the VPAA UI showcase. Wire a live backend adapter to connect your data agent.`
		: "Hello! I am the VPAA UI demo assistant. Ask me anything about your data or reports.";

	yield {
		type: EventType.RUN_STARTED,
		runId,
		threadId
	} as StreamChunk;

	yield {
		type: EventType.TEXT_MESSAGE_START,
		messageId,
		role: "assistant"
	} as StreamChunk;

	for (const delta of response) {
		yield {
			type: EventType.TEXT_MESSAGE_CONTENT,
			messageId,
			delta
		} as StreamChunk;
	}

	yield {
		type: EventType.TEXT_MESSAGE_END,
		messageId
	} as StreamChunk;

	yield {
		type: EventType.RUN_FINISHED,
		runId,
		threadId
	} as StreamChunk;
}
