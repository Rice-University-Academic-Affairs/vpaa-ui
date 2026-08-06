import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it } from "vitest";
import { buildThreadMetadataSync } from "./session-sync.js";
import type { ChatThreadRecord } from "./storage.js";

const messages: UIMessage[] = [
	{
		id: "1",
		role: "user",
		parts: [{ type: "text", content: "What changed in the last quarter?" }]
	},
	{
		id: "2",
		role: "assistant",
		parts: [{ type: "text", content: "Headcount increased by 3%." }]
	}
];

describe("buildThreadMetadataSync", () => {
	it("returns null when there are no messages", () => {
		expect(buildThreadMetadataSync("thread-1", [], null)).toBeNull();
	});

	it("creates a thread record when one does not exist", () => {
		const sync = buildThreadMetadataSync("thread-1", messages, null, "2026-03-20T00:00:00.000Z");

		expect(sync).toEqual({
			create: {
				id: "thread-1",
				title: "What changed in the last quarter?",
				preview: "Headcount increased by 3%.",
				updatedAt: "2026-03-20T00:00:00.000Z"
			}
		});
	});

	it("updates preview while preserving a custom title", () => {
		const existing: ChatThreadRecord = {
			id: "thread-1",
			title: "Faculty trends",
			preview: "Old preview",
			updatedAt: "2026-01-01"
		};

		const sync = buildThreadMetadataSync("thread-1", messages, existing, "2026-03-20T00:00:00.000Z");

		expect(sync).toEqual({
			patch: {
				title: "Faculty trends",
				preview: "Headcount increased by 3%.",
				updatedAt: "2026-03-20T00:00:00.000Z"
			}
		});
	});

	it("replaces the default title on first assistant reply", () => {
		const existing: ChatThreadRecord = {
			id: "thread-1",
			title: "New chat",
			updatedAt: "2026-01-01"
		};

		const sync = buildThreadMetadataSync("thread-1", messages, existing, "2026-03-20T00:00:00.000Z");

		expect(sync?.patch?.title).toBe("What changed in the last quarter?");
	});
});
