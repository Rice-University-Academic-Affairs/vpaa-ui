import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/ai-svelte", () => ({
	fetchServerSentEvents: (endpoint: string) => ({ adapter: "sse", endpoint })
}));

let resolveAiChatTransport: typeof import("./transport.js").resolveAiChatTransport;

beforeAll(async () => {
	({ resolveAiChatTransport } = await import("./transport.js"));
});

describe("resolveAiChatTransport", () => {
	it("resolves a string endpoint to SSE", () => {
		const resolved = resolveAiChatTransport("/api/chat");
		expect(resolved.connection).toEqual({ adapter: "sse", endpoint: "/api/chat" });
		expect(resolved.persistence).toBeUndefined();
	});

	it("enables server persistence for server mode", () => {
		const resolved = resolveAiChatTransport({
			mode: "server",
			endpoint: "/api/chat"
		});
		expect(resolved.persistence).toBe(true);
	});

	it("passes through custom connections", () => {
		const connection = { adapter: "custom" } as never;
		const resolved = resolveAiChatTransport({
			connection,
			forwardedProps: { model: "demo" }
		});
		expect(resolved.connection).toBe(connection);
		expect(resolved.forwardedProps).toEqual({ model: "demo" });
	});
});
