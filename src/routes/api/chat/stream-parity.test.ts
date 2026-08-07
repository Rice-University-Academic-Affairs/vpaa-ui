import { EventType, type StreamChunk } from "@tanstack/ai";
import { describe, expect, it } from "vitest";
import { createMockChatStream } from "./mock-stream.js";
import { createTestChatStream } from "$lib/ai-chat/test-utils/test-chat-stream.js";
import { serverTools } from "./tools.js";

async function collectChunks(generator: AsyncGenerator<StreamChunk>) {
	const chunks: StreamChunk[] = [];
	for await (const chunk of generator) {
		chunks.push(chunk);
	}
	return chunks;
}

function summarizeStream(chunks: StreamChunk[]) {
	const finished = chunks.at(-1);
	return {
		text: chunks
			.filter((chunk) => chunk.type === EventType.TEXT_MESSAGE_CONTENT)
			.map((chunk) => ("delta" in chunk ? chunk.delta : ""))
			.join(""),
		toolNames: chunks
			.filter((chunk) => chunk.type === EventType.TOOL_CALL_START)
			.map((chunk) => ("toolName" in chunk ? chunk.toolName : "")),
		outcome:
			finished && "outcome" in finished ? finished.outcome : undefined
	};
}

const baseParams = {
	threadId: "thread-1",
	runId: "run-1"
};

function interruptToolName(outcome: unknown) {
	if (!outcome || typeof outcome !== "object" || !("interrupts" in outcome)) {
		return undefined;
	}

	const interrupts = outcome.interrupts;
	if (!Array.isArray(interrupts) || interrupts.length === 0) {
		return undefined;
	}

	const first = interrupts[0];
	if (!first || typeof first !== "object" || !("metadata" in first)) {
		return undefined;
	}

	const metadata = first.metadata;
	if (!metadata || typeof metadata !== "object" || !("toolName" in metadata)) {
		return undefined;
	}

	return metadata.toolName;
}

describe("test chat stream prod parity", () => {
	it.each([
		{
			label: "default reply",
			userText: "Faculty trends",
			tools: serverTools
		},
		{
			label: "stats tool",
			userText: "Show me stats",
			tools: serverTools
		},
		{
			label: "headcount tool",
			userText: "What is the headcount?",
			tools: serverTools
		},
		{
			label: "scroll client tool",
			userText: "Please scroll to top",
			tools: [...serverTools, { name: "scroll_to_top" }]
		}
	])("matches production mock stream for $label", async ({ userText, tools }) => {
		const params = {
			...baseParams,
			tools,
			messages: [{ id: "m1", role: "user", content: userText }]
		};

		const prod = summarizeStream(await collectChunks(createMockChatStream(params)));
		const test = summarizeStream(await collectChunks(createTestChatStream(params)));

		expect(test.text).toBe(prod.text);
		expect(test.toolNames).toEqual(prod.toolNames);
		expect(test.outcome).toMatchObject({
			type: prod.outcome && typeof prod.outcome === "object" && "type" in prod.outcome
				? prod.outcome.type
				: undefined
		});
		if (prod.outcome && typeof prod.outcome === "object" && "interrupts" in prod.outcome) {
			expect(test.outcome).toMatchObject({
				interrupts: [
					expect.objectContaining({
						metadata: expect.objectContaining({
							toolName: interruptToolName(prod.outcome)
						})
					})
				]
			});
		}
	});

	it("handles resume payloads the same way as production", async () => {
		const params = {
			...baseParams,
			tools: serverTools,
			resume: { ok: true },
			messages: [{ id: "m1", role: "user", content: "ignored" }]
		};

		const prod = summarizeStream(await collectChunks(createMockChatStream(params)));
		const test = summarizeStream(await collectChunks(createTestChatStream(params)));

		expect(test.text).toBe(prod.text);
		expect(test.text).toBe("Client tool completed.");
	});

	it("only adds the set_flag branch in test mode", async () => {
		const params = {
			...baseParams,
			tools: [{ name: "set_flag" }],
			messages: [{ id: "m1", role: "user", content: "set-flag please" }]
		};

		const test = summarizeStream(await collectChunks(createTestChatStream(params)));
		expect(test.toolNames).toEqual(["set_flag"]);
		expect(test.outcome).toMatchObject({ type: "interrupt" });
	});
});
