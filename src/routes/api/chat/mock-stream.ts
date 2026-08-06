import { EventType, type AnyTool, type StreamChunk, type UIMessage } from "@tanstack/ai";

export type MockChatStreamParams = {
	messages: Array<UIMessage | { role?: string; content?: unknown; parts?: unknown }>;
	threadId: string;
	runId: string;
	tools: ReadonlyArray<AnyTool | { name: string }>;
	resume?: unknown;
};

function lastUserText(
	messages: MockChatStreamParams["messages"]
): string {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (!message || message.role !== "user") continue;

		if ("parts" in message && Array.isArray(message.parts)) {
			const text = message.parts
				.filter(
					(part): part is { type: "text"; content: string } =>
						!!part &&
						typeof part === "object" &&
						"type" in part &&
						part.type === "text" &&
						"content" in part &&
						typeof part.content === "string"
				)
				.map((part) => part.content)
				.join("");
			if (text) return text;
		}

		if ("content" in message && typeof message.content === "string") {
			return message.content;
		}
	}

	return "";
}

function hasTool(tools: MockChatStreamParams["tools"], name: string): boolean {
	return tools.some((tool) => tool.name === name);
}

function defaultResponse(userText: string): string {
	return userText
		? `Thanks for your question about "${userText}". This is a demo response from the VPAA UI showcase. Wire your own backend to connect a live agent.`
		: "Hello! I am the VPAA UI demo assistant. Ask me anything about your data or reports.";
}

async function* emitTextResponse(
	response: string,
	threadId: string,
	runId: string
): AsyncGenerator<StreamChunk> {
	const messageId = crypto.randomUUID();

	yield { type: EventType.RUN_STARTED, runId, threadId } as StreamChunk;
	yield { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" } as StreamChunk;

	for (const delta of response) {
		yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta } as StreamChunk;
	}

	yield { type: EventType.TEXT_MESSAGE_END, messageId } as StreamChunk;
	yield {
		type: EventType.RUN_FINISHED,
		runId,
		threadId,
		outcome: { type: "success" }
	} as StreamChunk;
}

async function* emitServerToolResponse(
	threadId: string,
	runId: string,
	output: Record<string, unknown>
): AsyncGenerator<StreamChunk> {
	const messageId = crypto.randomUUID();
	const toolCallId = crypto.randomUUID();

	yield { type: EventType.RUN_STARTED, runId, threadId } as StreamChunk;
	yield { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" } as StreamChunk;
	yield {
		type: EventType.TOOL_CALL_START,
		toolCallId,
		toolCallName: "get_demo_stats",
		toolName: "get_demo_stats",
		parentMessageId: messageId
	} as StreamChunk;
	yield {
		type: EventType.TOOL_CALL_END,
		toolCallId,
		toolCallName: "get_demo_stats",
		toolName: "get_demo_stats",
		input: {},
		result: JSON.stringify(output)
	} as StreamChunk;
	yield {
		type: EventType.TEXT_MESSAGE_CONTENT,
		messageId,
		delta: `Demo stats: ${output.facultyCount} faculty across ${output.departmentCount} departments.`
	} as StreamChunk;
	yield { type: EventType.TEXT_MESSAGE_END, messageId } as StreamChunk;
	yield {
		type: EventType.RUN_FINISHED,
		runId,
		threadId,
		outcome: { type: "success" }
	} as StreamChunk;
}

async function* emitClientToolRequest(
	threadId: string,
	runId: string
): AsyncGenerator<StreamChunk> {
	const messageId = crypto.randomUUID();
	const toolCallId = crypto.randomUUID();

	yield { type: EventType.RUN_STARTED, runId, threadId } as StreamChunk;
	yield { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" } as StreamChunk;
	yield {
		type: EventType.TOOL_CALL_START,
		toolCallId,
		toolCallName: "scroll_to_top",
		toolName: "scroll_to_top",
		parentMessageId: messageId
	} as StreamChunk;
	yield {
		type: EventType.TOOL_CALL_END,
		toolCallId,
		toolCallName: "scroll_to_top",
		toolName: "scroll_to_top",
		input: {}
	} as StreamChunk;
	yield {
		type: EventType.RUN_FINISHED,
		runId,
		threadId,
		outcome: {
			type: "interrupt",
			interrupts: [
				{
					id: `client_tool_${toolCallId}`,
					reason: "tanstack:client_tool_execution",
					message: "Client tool scroll_to_top is ready to run",
					toolCallId,
					responseSchema: {
						type: "object",
						properties: { scrolled: { type: "boolean" } },
						required: ["scrolled"]
					},
					metadata: {
						kind: "client_tool",
						toolName: "scroll_to_top",
						input: {}
					}
				}
			]
		}
	} as StreamChunk;
}

export async function* createMockChatStream(
	params: MockChatStreamParams
): AsyncGenerator<StreamChunk> {
	if (params.resume) {
		yield* emitTextResponse("Client tool completed.", params.threadId, params.runId);
		return;
	}

	const userText = lastUserText(params.messages);
	const normalized = userText.toLowerCase();

	if (normalized.includes("scroll") && hasTool(params.tools, "scroll_to_top")) {
		yield* emitClientToolRequest(params.threadId, params.runId);
		return;
	}

	if (
		(normalized.includes("stats") || normalized.includes("headcount")) &&
		hasTool(params.tools, "get_demo_stats")
	) {
		yield* emitServerToolResponse(params.threadId, params.runId, {
			facultyCount: 1247,
			departmentCount: 42
		});
		return;
	}

	yield* emitTextResponse(defaultResponse(userText), params.threadId, params.runId);
}
