import { describe, expect, expectTypeOf, it } from "vitest";
import type { AiChatSession } from "./create-ai-chat-session.svelte.js";
import type { ChatStorage, ChatThreadRecord, ChatThreadStorage } from "./storage.js";
import type { AiChatThread, AppShellChat } from "../types/chat.js";

describe("public type contracts", () => {
	it("treats ChatThreadRecord as AiChatThread", () => {
		const thread: ChatThreadRecord = {
			id: "thread-1",
			title: "Example"
		};
		const alias: AiChatThread = thread;

		expect(alias.id).toBe("thread-1");
	});

	it("treats ChatThreadStorage as ChatStorage", () => {
		expectTypeOf<ChatThreadStorage>().toEqualTypeOf<ChatStorage>();
	});

	it("treats AppShellChat as AiChatSession", () => {
		expectTypeOf<AppShellChat>().toEqualTypeOf<AiChatSession>();
	});
});
