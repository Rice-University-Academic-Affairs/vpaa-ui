import { EventType, type AnyTool, type StreamChunk, type UIMessage } from "@tanstack/ai";

export type TestChatStreamParams = {
	messages: Array<UIMessage | { role?: string; content?: unknown; parts?: unknown }>;
	threadId: string;
	runId: string;
	tools: ReadonlyArray<AnyTool | { name: string }>;
	resume?: unknown;
};

function lastUserText(messages: TestChatStreamParams["messages"]): string {
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

function hasTool(tools: TestChatStreamParams["tools"], name: string): boolean {
	return tools.some((tool) => tool.name === name);
}

async function* emitTextResponse(
	response: string,
	threadId: string,
	runId: string
): AsyncGenerator<StreamChunk> {
	const messageId = crypto.randomUUID();

	yield { type: EventType.RUN_STARTED, runId, threadId } as StreamChunk;
	yield { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" } as StreamChunk;
	yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: response } as StreamChunk;
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
	toolName: string,
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
		toolCallName: toolName,
		toolName,
		parentMessageId: messageId
	} as StreamChunk;
	yield {
		type: EventType.TOOL_CALL_END,
		toolCallId,
		toolCallName: toolName,
		toolName,
		input: toolName === "set_flag" ? { value: "from-server" } : {}
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
					message: `Client tool ${toolName} is ready to run`,
					toolCallId,
					responseSchema: {
						type: "object",
						properties:
							toolName === "set_flag"
								? { ok: { type: "boolean" } }
								: { scrolled: { type: "boolean" } },
						required: toolName === "set_flag" ? ["ok"] : ["scrolled"]
					},
					metadata: {
						kind: "client_tool",
						toolName,
						input: toolName === "set_flag" ? { value: "from-server" } : {}
					}
				}
			]
		}
	} as StreamChunk;
}

export async function* createTestChatStream(
	params: TestChatStreamParams
): AsyncGenerator<StreamChunk> {
	if (params.resume) {
		yield* emitTextResponse("Client tool completed.", params.threadId, params.runId);
		return;
	}

	const userText = lastUserText(params.messages);
	const normalized = userText.toLowerCase();

	if (normalized.includes("set-flag") && hasTool(params.tools, "set_flag")) {
		yield* emitClientToolRequest("set_flag", params.threadId, params.runId);
		return;
	}

	if (normalized.includes("scroll") && hasTool(params.tools, "scroll_to_top")) {
		yield* emitClientToolRequest("scroll_to_top", params.threadId, params.runId);
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

	yield* emitTextResponse(
		userText
			? `Echo: ${userText}`
			: "Hello from the test chat server.",
		params.threadId,
		params.runId
	);
}
