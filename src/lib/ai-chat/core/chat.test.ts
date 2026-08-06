import { EventType } from "@tanstack/ai";
import type { ConnectConnectionAdapter } from "@tanstack/ai-client";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CHAT_ENDPOINT } from "../constants.js";
import { resolveAiChat } from "./chat.js";

function expectConnectable(connection: ConnectConnectionAdapter) {
	expect(connection.connect).toBeTypeOf("function");
}

vi.mock("@tanstack/ai-svelte", () => ({
	fetchServerSentEvents: (endpoint: string) => ({ adapter: "sse", endpoint })
}));

describe("resolveAiChat", () => {
	it("uses a simple JSON chat connection for string endpoints", () => {
		const resolved = resolveAiChat("/api/chat");
		expectConnectable(resolved.connection);
		expect(resolved.persistence).toBeUndefined();
	});

	it("uses a simple JSON chat connection for endpoint objects", () => {
		const resolved = resolveAiChat({
			endpoint: "/api/chat",
			props: { departmentId: "engineering" }
		});

		expectConnectable(resolved.connection);
		expect(resolved.forwardedProps).toEqual({ departmentId: "engineering" });
	});

	it("uses server persistence for server mode", () => {
		const resolved = resolveAiChat({
			mode: "server",
			endpoint: DEFAULT_CHAT_ENDPOINT
		});

		expect(resolved.persistence).toBe(true);
		expectConnectable(resolved.connection);
	});

	it("uses TanStack SSE for tanstack-sse mode", () => {
		const resolved = resolveAiChat({
			mode: "tanstack-sse",
			endpoint: "/api/ag-ui"
		});

		expect(resolved.connection).toEqual({ adapter: "sse", endpoint: "/api/ag-ui" });
	});

	it("wraps chat handlers as connections", async () => {
		const resolved = resolveAiChat(async () => "Done");
		const chunks = [];

		for await (const chunk of resolved.connection.connect!(
			[],
			undefined,
			new AbortController().signal,
			{ threadId: "thread-1", runId: "run-1" }
		)) {
			chunks.push(chunk);
		}

		expect(
			chunks
				.filter((chunk) => chunk.type === EventType.TEXT_MESSAGE_CONTENT)
				.map((chunk) => ("delta" in chunk ? chunk.delta : ""))
				.join("")
		).toBe("Done");
	});
});
