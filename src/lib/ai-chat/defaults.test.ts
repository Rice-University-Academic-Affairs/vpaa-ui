import { describe, expect, it } from "vitest";
import { resolveAiChatTransport } from "./transport.js";

describe("chat transport defaults", () => {
	it("uses /api/chat for string transports", () => {
		const resolved = resolveAiChatTransport("/api/chat");
		expect(resolved.connection).toBeTruthy();
		expect(resolved.persistence).toBeUndefined();
	});

	it("uses /api/chat for endpoint object transports", () => {
		const resolved = resolveAiChatTransport({ endpoint: "/api/chat" });
		expect(resolved.connection).toBeTruthy();
		expect(resolved.forwardedProps).toBeUndefined();
	});
});
