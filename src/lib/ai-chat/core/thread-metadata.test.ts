import { describe, expect, it } from "vitest";
import {
	defaultThreadPreview,
	defaultThreadTitle,
	firstUserMessageText,
	lastAssistantMessageText,
	messageText,
	truncateText
} from "./thread-metadata.js";
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
		parts: [{ type: "text", content: "Headcount increased by 3% across engineering departments." }]
	}
];

describe("messageText", () => {
	it("joins text parts", () => {
		expect(messageText(messages[0]!)).toBe("What changed in the last quarter?");
	});
});

describe("firstUserMessageText", () => {
	it("returns the first user message with text", () => {
		expect(firstUserMessageText(messages)).toBe("What changed in the last quarter?");
	});

	it("returns undefined when no user text exists", () => {
		expect(
			firstUserMessageText([
				{
					id: "assistant-only",
					role: "assistant",
					parts: [{ type: "text", content: "Hello" }]
				}
			])
		).toBeUndefined();
	});
});

describe("lastAssistantMessageText", () => {
	it("returns the latest assistant message with text", () => {
		expect(lastAssistantMessageText(messages)).toBe(
			"Headcount increased by 3% across engineering departments."
		);
	});
});

describe("truncateText", () => {
	it("returns short strings unchanged", () => {
		expect(truncateText("short")).toBe("short");
	});

	it("truncates long strings with an ellipsis", () => {
		const long = "a".repeat(100);
		expect(truncateText(long, 20)).toBe(`${"a".repeat(19)}…`);
	});
});

describe("defaultThreadTitle", () => {
	it("derives a title from the first user message", () => {
		expect(defaultThreadTitle(messages)).toBe("What changed in the last quarter?");
	});

	it("falls back to New chat when there is no user text", () => {
		expect(defaultThreadTitle([])).toBe("New chat");
	});
});

describe("defaultThreadPreview", () => {
	it("derives a preview from the latest assistant message", () => {
		expect(defaultThreadPreview(messages)).toBe(
			"Headcount increased by 3% across engineering departments."
		);
	});

	it("falls back to the first user message when no assistant reply exists", () => {
		expect(
			defaultThreadPreview([
				{
					id: "user-only",
					role: "user",
					parts: [{ type: "text", content: "Pending answer" }]
				}
			])
		).toBe("Pending answer");
	});
});
