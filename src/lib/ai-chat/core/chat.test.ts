import { describe, expect, it, vi } from "vitest";
import { resolveAiChat } from "./chat.js";

const fetchServerSentEventsMock = vi.hoisted(() =>
	vi.fn(() => ({
		connect: vi.fn()
	}))
);

vi.mock("@tanstack/ai-svelte", () => ({
	fetchServerSentEvents: fetchServerSentEventsMock
}));

describe("resolveAiChat", () => {
	it("uses fetchServerSentEvents for AG-UI SSE connections", () => {
		const resolved = resolveAiChat("/api/chat");

		expect(fetchServerSentEventsMock).toHaveBeenCalledWith("/api/chat");
		expect(resolved.connection).toEqual({ connect: expect.any(Function) });
	});

	it("passes custom endpoints to fetchServerSentEvents", () => {
		resolveAiChat("/custom/chat");

		expect(fetchServerSentEventsMock).toHaveBeenCalledWith("/custom/chat");
	});
});
