import { EventType, type StreamChunk } from "@tanstack/ai";
import {
	createMockChatStream,
	type MockChatStreamParams
} from "../../../routes/api/chat/mock-stream.js";

export type TestChatStreamParams = MockChatStreamParams;

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

async function* emitSetFlagClientToolRequest(
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
		toolCallName: "set_flag",
		toolName: "set_flag",
		parentMessageId: messageId
	} as StreamChunk;
	yield {
		type: EventType.TOOL_CALL_END,
		toolCallId,
		toolCallName: "set_flag",
		toolName: "set_flag",
		input: { value: "from-server" }
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
					message: "Client tool set_flag is ready to run",
					toolCallId,
					responseSchema: {
						type: "object",
						properties: { ok: { type: "boolean" } },
						required: ["ok"]
					},
					metadata: {
						kind: "client_tool",
						toolName: "set_flag",
						input: { value: "from-server" }
					}
				}
			]
		}
	} as StreamChunk;
}

export async function* createTestChatStream(
	params: TestChatStreamParams
): AsyncGenerator<StreamChunk> {
	if (!params.resume) {
		const normalized = lastUserText(params.messages).toLowerCase();
		if (normalized.includes("set-flag") && hasTool(params.tools, "set_flag")) {
			yield* emitSetFlagClientToolRequest(params.threadId, params.runId);
			return;
		}
	}

	yield* createMockChatStream(params);
}
