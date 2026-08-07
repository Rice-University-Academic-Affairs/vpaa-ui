import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { MessagePart, UIMessage } from "@tanstack/ai-client";
import { createScrollToTopClientTool } from "../tools/examples/scroll-to-top.js";
import { clientTools } from "../tools/index.js";
import { createLocalChatStorage } from "../core/storage.js";
import { flushAsyncWork } from "../test-utils/mock-chat-client.js";
import { mountSession } from "../test-utils/mount-session.js";
import { startProdChatServer, type TestChatServer } from "../test-utils/test-chat-server.js";
import { waitForChatIdle } from "../test-utils/wait-for-chat.js";

function createTestStorage() {
	return createLocalChatStorage({
		keyPrefix: `prod-parity:${crypto.randomUUID()}:`
	});
}

function assistantText(
	messages: Array<{ role: string; parts: Array<{ type: string; content?: string }> }>
) {
	return messages
		.filter((message) => message.role === "assistant")
		.flatMap((message) =>
			message.parts
				.filter((part) => part.type === "text" && typeof part.content === "string")
				.map((part) => part.content as string)
		)
		.join("");
}

describe("AI chat prod stream integration", () => {
	let server: TestChatServer;

	beforeAll(async () => {
		server = await startProdChatServer();
	});

	afterAll(async () => {
		await server.close();
	});

	afterEach(async () => {
		await flushAsyncWork();
	});

	it("streams the production demo reply through the real TanStack client", async () => {
		const storage = createTestStorage();
		await storage.createThread({ id: "thread-prod", title: "Prod chat" });
		const session = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-prod"
		});

		await session.chat!.sendMessage("Faculty trends");
		await waitForChatIdle(session.chat!);

		expect(assistantText(session.chat!.messages)).toContain(
			'Thanks for your question about "Faculty trends"'
		);
	});

	it("streams the production stats tool response through the real TanStack client", async () => {
		const storage = createTestStorage();
		await storage.createThread({ id: "thread-stats", title: "Stats chat" });
		const session = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-stats"
		});

		await session.chat!.sendMessage("Show me stats");
		await waitForChatIdle(session.chat!);

		expect(assistantText(session.chat!.messages)).toContain("1247 faculty across 42 departments");

		const toolCall = session.chat!.messages
			.flatMap((message: UIMessage) => message.parts)
			.find((part: MessagePart) => part.type === "tool-call" && part.name === "get_demo_stats");

		expect(toolCall).toBeDefined();
	});

	it("executes scroll_to_top when the production stream requests it", async () => {
		const storage = createTestStorage();
		await storage.createThread({ id: "thread-scroll", title: "Scroll chat" });
		const session = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-scroll",
			clientTools: clientTools(createScrollToTopClientTool())
		});

		await session.chat!.sendMessage("Please scroll to top");
		await waitForChatIdle(session.chat!);

		const toolCall = session.chat!.messages
			.flatMap((message: UIMessage) => message.parts)
			.find((part: MessagePart) => part.type === "tool-call" && part.name === "scroll_to_top");

		expect(toolCall).toMatchObject({
			type: "tool-call",
			name: "scroll_to_top",
			state: "complete"
		});
	});
});
