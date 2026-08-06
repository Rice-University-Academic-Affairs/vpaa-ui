import { EventType } from "@tanstack/ai";
import { describe, expect, it } from "vitest";
import { createMockChatStream } from "./mock-stream.js";

async function collectStream(body: Record<string, unknown>) {
	const chunks = [];
	for await (const chunk of createMockChatStream(body)) {
		chunks.push(chunk);
	}
	return chunks;
}

describe("createMockChatStream", () => {
	it("emits a full assistant text run for an empty conversation", async () => {
		const chunks = await collectStream({});

		expect(chunks[0]).toMatchObject({ type: EventType.RUN_STARTED });
		expect(chunks.at(-1)).toMatchObject({ type: EventType.RUN_FINISHED });
		expect(chunks.some((chunk) => chunk.type === EventType.TEXT_MESSAGE_START)).toBe(true);
		expect(chunks.some((chunk) => chunk.type === EventType.TEXT_MESSAGE_END)).toBe(true);
	});

	it("echoes the latest user message in the assistant response", async () => {
		const chunks = await collectStream({
			messages: [{ role: "user", content: "Faculty trends" }]
		});
		const content = chunks
			.filter((chunk) => chunk.type === EventType.TEXT_MESSAGE_CONTENT)
			.map((chunk) => ("delta" in chunk ? chunk.delta : ""))
			.join("");

		expect(content).toContain("Faculty trends");
	});

	it("uses the provided threadId on run events", async () => {
		const chunks = await collectStream({ threadId: "thread-42" });

		expect(chunks[0]).toMatchObject({
			type: EventType.RUN_STARTED,
			threadId: "thread-42"
		});
		expect(chunks.at(-1)).toMatchObject({
			type: EventType.RUN_FINISHED,
			threadId: "thread-42"
		});
	});
});
