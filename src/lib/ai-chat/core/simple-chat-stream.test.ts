import { EventType } from "@tanstack/ai";
import { describe, expect, it } from "vitest";
import { chunksFromText } from "./simple-chat-stream.js";

describe("chunksFromText", () => {
	it("emits a complete assistant text run", async () => {
		const chunks = [];
		for await (const chunk of chunksFromText("Hello there", "thread-1")) {
			chunks.push(chunk);
		}

		expect(chunks[0]).toMatchObject({ type: EventType.RUN_STARTED, threadId: "thread-1" });
		expect(chunks.at(-1)).toMatchObject({ type: EventType.RUN_FINISHED, threadId: "thread-1" });
		expect(
			chunks
				.filter((chunk) => chunk.type === EventType.TEXT_MESSAGE_CONTENT)
				.map((chunk) => ("delta" in chunk ? chunk.delta : ""))
				.join("")
		).toBe("Hello there");
	});
});
