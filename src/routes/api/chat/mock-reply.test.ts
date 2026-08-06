import { describe, expect, it } from "vitest";
import { createMockChatReply } from "./mock-reply.js";

describe("createMockChatReply", () => {
	it("returns a welcome message for an empty conversation", () => {
		expect(createMockChatReply({})).toContain("demo assistant");
	});

	it("echoes the latest user message", () => {
		expect(
			createMockChatReply({
				messages: [{ role: "user", content: "Faculty trends" }]
			})
		).toContain("Faculty trends");
	});
});
