import { EventType, type StreamChunk } from "@tanstack/ai";
import { describe, expect, it } from "vitest";
import { createMockChatStream } from "./mock-stream.js";
import { serverTools } from "./server-tools.js";

async function collectChunks(generator: AsyncGenerator<StreamChunk>) {
	const chunks: StreamChunk[] = [];
	for await (const chunk of generator) {
		chunks.push(chunk);
	}
	return chunks;
}

const baseParams = {
	threadId: "thread-1",
	runId: "run-1",
	tools: serverTools
};

describe("createMockChatStream", () => {
	it("emits a complete AG-UI text run", async () => {
		const chunks = await collectChunks(
			createMockChatStream({
				...baseParams,
				messages: [{ id: "m1", role: "user", content: "Faculty trends" }]
			})
		);

		expect(chunks[0]).toMatchObject({ type: EventType.RUN_STARTED, threadId: "thread-1" });
		expect(chunks.at(-1)).toMatchObject({
			type: EventType.RUN_FINISHED,
			threadId: "thread-1",
			outcome: { type: "success" }
		});
		expect(
			chunks
				.filter((chunk) => chunk.type === EventType.TEXT_MESSAGE_CONTENT)
				.map((chunk) => ("delta" in chunk ? chunk.delta : ""))
				.join("")
		).toContain("Faculty trends");
	});

	it("executes the demo server tool when stats are requested", async () => {
		const chunks = await collectChunks(
			createMockChatStream({
				...baseParams,
				messages: [{ id: "m1", role: "user", content: "Show me stats" }]
			})
		);

		expect(chunks.some((chunk) => chunk.type === EventType.TOOL_CALL_START)).toBe(true);
		expect(
			chunks.find((chunk) => chunk.type === EventType.TOOL_CALL_END)
		).toMatchObject({
			toolCallName: "get_demo_stats",
			result: JSON.stringify({ facultyCount: 1247, departmentCount: 42 })
		});
	});

	it("requests client tool execution when scroll is requested", async () => {
		const chunks = await collectChunks(
			createMockChatStream({
				...baseParams,
				tools: [...serverTools, { name: "scroll_to_top" }],
				messages: [{ id: "m1", role: "user", content: "Please scroll to top" }]
			})
		);

		const finished = chunks.at(-1);
		expect(finished).toMatchObject({
			type: EventType.RUN_FINISHED,
			outcome: {
				type: "interrupt",
				interrupts: [
					expect.objectContaining({
						metadata: expect.objectContaining({
							kind: "client_tool",
							toolName: "scroll_to_top"
						})
					})
				]
			}
		});
	});
});
