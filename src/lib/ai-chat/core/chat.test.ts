import type { ConnectConnectionAdapter } from "@tanstack/ai-client";
import { describe, expect, it, vi } from "vitest";
import { createChatConnection, resolveAiChat } from "./chat.js";

describe("resolveAiChat", () => {
	it("creates a JSON chat connection for endpoint strings", () => {
		const resolved = resolveAiChat("/api/chat");
		expect((resolved.connection as ConnectConnectionAdapter).connect).toBeTypeOf("function");
	});
});

describe("createChatConnection", () => {
	it("posts threadId and messages to the endpoint", async () => {
		const fetchMock = vi.fn(async () => Response.json({ message: "Hello there" }));
		vi.stubGlobal("fetch", fetchMock);

		const connection = createChatConnection("/api/chat");
		const chunks = [];

		for await (const chunk of connection.connect!(
			[{ id: "m1", role: "user", parts: [{ type: "text", content: "Hi" }] }],
			undefined,
			new AbortController().signal,
			{ threadId: "thread-1", runId: "run-1" }
		)) {
			chunks.push(chunk);
		}

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/chat",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					threadId: "thread-1",
					messages: [{ id: "m1", role: "user", parts: [{ type: "text", content: "Hi" }] }]
				})
			})
		);

		vi.unstubAllGlobals();
	});
});
