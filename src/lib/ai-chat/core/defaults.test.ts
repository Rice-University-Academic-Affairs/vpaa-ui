import { describe, expect, it } from "vitest";
import { resolveAiChatTransport } from "./transport.js";
import { DEFAULT_CHAT_TRANSPORT } from "../constants.js";

describe("chat transport defaults", () => {
	it("uses the default chat transport for string transports", () => {
		const resolved = resolveAiChatTransport(DEFAULT_CHAT_TRANSPORT);
		expect(resolved.connection).toBeTruthy();
		expect(resolved.persistence).toBeUndefined();
	});

	it("uses the default chat transport for endpoint object transports", () => {
		const resolved = resolveAiChatTransport({ endpoint: DEFAULT_CHAT_TRANSPORT });
		expect(resolved.connection).toBeTruthy();
		expect(resolved.forwardedProps).toBeUndefined();
	});
});
