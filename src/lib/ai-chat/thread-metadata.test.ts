import { describe, expect, it } from "vitest";
import { defaultThreadPreview, defaultThreadTitle } from "./thread-metadata.js";
import type { UIMessage } from "@tanstack/ai-client";

const messages: UIMessage[] = [
	{
		id: "1",
		role: "user",
		parts: [{ type: "text", content: "What changed in the last quarter?" }]
	},
	{
		id: "2",
		role: "assistant",
		parts: [
			{
				type: "text",
				content: "Headcount increased by 3% across engineering departments."
			}
		]
	}
];

describe("thread metadata helpers", () => {
	it("derives a title from the first user message", () => {
		expect(defaultThreadTitle(messages)).toBe("What changed in the last quarter?");
	});

	it("derives a preview from the latest assistant message", () => {
		expect(defaultThreadPreview(messages)).toBe(
			"Headcount increased by 3% across engineering departments."
		);
	});
});
