import { describe, expect, expectTypeOf, it } from "vitest";
import type { AiChatSession } from "../session/create-session.svelte.js";
import type { ChatStorage } from "../core/storage.js";
import type { AiChatThread } from "../core/types.js";
import type { AppShellChat } from "../../types/shell.js";
import * as publicApi from "../index.js";

describe("public type contracts", () => {
	it("exposes session-first chat APIs only", () => {
		expect(publicApi).toHaveProperty("createAiChatSession");
		expect(publicApi).not.toHaveProperty("createAiChat");
		expect(publicApi).not.toHaveProperty("resolveAiChat");
		expect(publicApi).toHaveProperty("DEFAULT_CHAT_ENDPOINT");
		expect(publicApi).toHaveProperty("DEFAULT_CHAT_TRANSPORT");
	});
	it("uses AiChatThread throughout storage types", () => {
		const thread: AiChatThread = {
			id: "thread-1",
			title: "Example"
		};

		expect(thread.id).toBe("thread-1");
	});

	it("allows ChatStorage to work with AiChatThread records", () => {
		expectTypeOf<ChatStorage["listThreads"]>().returns.toEqualTypeOf<
			AiChatThread[] | Promise<AiChatThread[]>
		>();
	});

	it("treats AppShellChat as AiChatSession", () => {
		expectTypeOf<AppShellChat>().toEqualTypeOf<AiChatSession>();
	});
});
