import { EventType, type StreamChunk } from "@tanstack/ai";
import { describe, expect, it } from "vitest";
import { createTestChatStream } from "../test-utils/test-chat-stream.js";
import { createMockChatStream } from "../../../routes/api/chat/mock-stream.js";

async function collectChunks(generator: AsyncGenerator<StreamChunk>) {
	const chunks: StreamChunk[] = [];
	for await (const chunk of generator) {
		chunks.push(chunk);
	}
	return chunks;
}

describe("createTestChatStream", () => {
	it("delegates default replies to the production mock stream", async () => {
		const params = {
			threadId: "thread-1",
			runId: "run-1",
			tools: [],
			messages: [{ id: "m1", role: "user", content: "Hello" }]
		};

		const prodText = (
			await collectChunks(createMockChatStream(params))
		)
			.filter((chunk) => chunk.type === EventType.TEXT_MESSAGE_CONTENT)
			.map((chunk) => ("delta" in chunk ? chunk.delta : ""))
			.join("");

		const testText = (
			await collectChunks(createTestChatStream(params))
		)
			.filter((chunk) => chunk.type === EventType.TEXT_MESSAGE_CONTENT)
			.map((chunk) => ("delta" in chunk ? chunk.delta : ""))
			.join("");

		expect(testText).toBe(prodText);
		expect(testText).toContain("Hello");
	});

	it("requests set_flag client tool execution", async () => {
		const chunks = await collectChunks(
			createTestChatStream({
				threadId: "thread-1",
				runId: "run-1",
				tools: [{ name: "set_flag" }],
				messages: [{ id: "m1", role: "user", content: "set-flag please" }]
			})
		);

		expect(chunks.at(-1)).toMatchObject({
			type: EventType.RUN_FINISHED,
			outcome: {
				type: "interrupt",
				interrupts: [
					expect.objectContaining({
						metadata: expect.objectContaining({
							toolName: "set_flag"
						})
					})
				]
			}
		});
	});
});
