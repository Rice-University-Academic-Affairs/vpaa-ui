import { describe, expect, it } from "vitest";
import type { ConnectConnectionAdapter } from "@tanstack/ai-client";
import { DEFAULT_CHAT_ENDPOINT } from "../constants.js";
import { resolveAiChat } from "./chat.js";

describe("chat defaults", () => {
	it("defaults to the shared chat endpoint", () => {
		const resolved = resolveAiChat(DEFAULT_CHAT_ENDPOINT);
		expect((resolved.connection as ConnectConnectionAdapter).connect).toBeTypeOf("function");
	});
});
