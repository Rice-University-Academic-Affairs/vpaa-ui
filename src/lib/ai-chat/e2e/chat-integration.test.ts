import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { MessagePart, UIMessage } from "@tanstack/ai-client";
import { clientTools } from "../tools/index.js";
import { createLocalChatStorage } from "../core/storage.js";
import { flushAsyncWork } from "../test-utils/mock-chat-client.js";
import { mountSession } from "../test-utils/mount-session.js";
import { createSetFlagClientTool } from "../test-utils/test-client-tool.js";
import { startTestChatServer, type TestChatServer } from "../test-utils/test-chat-server.js";
import { waitFor, waitForChatIdle } from "../test-utils/wait-for-chat.js";

function createTestStorage() {
	return createLocalChatStorage({
		keyPrefix: `e2e:${crypto.randomUUID()}:`
	});
}

function assistantText(messages: Array<{ role: string; parts: Array<{ type: string; content?: string }> }>) {
	return messages
		.filter((message) => message.role === "assistant")
		.flatMap((message) =>
			message.parts
				.filter((part) => part.type === "text" && typeof part.content === "string")
				.map((part) => part.content as string)
		)
		.join("");
}

describe("AI chat integration", () => {
	let server: TestChatServer;

	beforeAll(async () => {
		server = await startTestChatServer();
	});

	afterAll(async () => {
		await server.close();
	});

	beforeEach(() => {
		server.requests.length = 0;
	});

	afterEach(async () => {
		await flushAsyncWork();
	});

	it("completes a basic AG-UI round-trip and echoes the user message", async () => {
		const storage = createTestStorage();
		const session = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-basic"
		});
		await storage.createThread({ id: "thread-basic", title: "Basic chat" });

		await session.chat!.sendMessage("Faculty trends");
		await waitForChatIdle(session.chat!);

		expect(assistantText(session.chat!.messages)).toContain("Echo: Faculty trends");
		expect(server.requests).toHaveLength(1);
		expect(server.requests[0]?.threadId).toBe("thread-basic");
	});

	it("persists messages in localStorage through ChatStorage", async () => {
		const storage = createTestStorage();
		const session = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-persist"
		});
		await storage.createThread({ id: "thread-persist", title: "Persist chat" });

		await session.chat!.sendMessage("Persist this");
		await waitForChatIdle(session.chat!);

		const persisted = await storage.getMessages("thread-persist");
		expect(persisted?.some((message) => message.role === "user")).toBe(true);
		expect(persisted?.some((message) => message.role === "assistant")).toBe(true);
	});

	it("restores conversation history from localStorage in a new session", async () => {
		const storage = createTestStorage();
		const first = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-restore"
		});
		await storage.createThread({ id: "thread-restore", title: "Restore chat" });

		await first.chat!.sendMessage("Restore me");
		await waitForChatIdle(first.chat!);
		first.dispose();

		const second = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-restore"
		});
		await flushAsyncWork();

		expect(second.chat!.messages.some((message: UIMessage) => message.role === "user")).toBe(true);
		expect(second.chat!.messages.some((message: UIMessage) => message.role === "assistant")).toBe(
			true
		);
		second.dispose();
	});

	it("advertises registered client tools in the AG-UI request body", async () => {
		const storage = createTestStorage();
		const session = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-tools",
			tools: clientTools(createSetFlagClientTool(() => {}))
		});
		await storage.createThread({ id: "thread-tools", title: "Tool chat" });

		await session.chat!.sendMessage("Hello");
		await waitForChatIdle(session.chat!);

		expect(server.requests[0]?.tools).toEqual([
			expect.objectContaining({
				name: "set_flag",
				description: expect.any(String),
				parameters: expect.objectContaining({ type: "object" })
			})
		]);
	});

	it("executes a client tool when the server requests it", async () => {
		const executed: string[] = [];
		const storage = createTestStorage();
		const session = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-client-tool",
			tools: clientTools(
				createSetFlagClientTool((value) => {
					executed.push(value);
				})
			)
		});
		await storage.createThread({ id: "thread-client-tool", title: "Client tool chat" });

		await session.chat!.sendMessage("Please set-flag now");
		await waitForChatIdle(session.chat!);

		await waitFor(() => executed.length > 0, {
			message: "Client tool was not executed"
		});

		expect(executed).toEqual(["from-server"]);

		const toolCall = session.chat!.messages
			.flatMap((message: UIMessage) => message.parts)
			.find((part: MessagePart) => part.type === "tool-call" && part.name === "set_flag");

		expect(toolCall).toMatchObject({
			type: "tool-call",
			name: "set_flag",
			state: "complete"
		});

		expect(server.requests.length).toBeGreaterThanOrEqual(1);
		if (server.requests.length > 1) {
			expect(server.requests.at(-1)?.resume).toBeDefined();
		}
	});

	it("streams a server tool result into the assistant reply", async () => {
		const storage = createTestStorage();
		const session = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-server-tool"
		});
		await storage.createThread({ id: "thread-server-tool", title: "Server tool chat" });

		await session.chat!.sendMessage("Show me stats");
		await waitForChatIdle(session.chat!);

		expect(assistantText(session.chat!.messages)).toContain("1247 faculty across 42 departments");

		const toolCall = session.chat!.messages
			.flatMap((message: UIMessage) => message.parts)
			.find((part: MessagePart) => part.type === "tool-call" && part.name === "get_demo_stats");

		expect(toolCall).toBeDefined();
	});

	it("syncs thread metadata after a completed assistant reply", async () => {
		const storage = createTestStorage();
		const session = await mountSession({
			storage,
			chat: server.url,
			threadId: "thread-metadata"
		});
		await storage.createThread({ id: "thread-metadata", title: "New chat" });

		await session.chat!.sendMessage("Budget question");
		await waitForChatIdle(session.chat!);

		await waitFor(() => {
			const thread = session.threads.find((entry) => entry.id === "thread-metadata");
			return thread?.title === "Budget question" && Boolean(thread.preview?.includes("Echo:"));
		});

		const thread = await storage.getThread("thread-metadata");
		expect(thread).toMatchObject({
			title: "Budget question",
			preview: expect.stringContaining("Echo: Budget question")
		});
		expect(session.threads.find((entry) => entry.id === "thread-metadata")).toMatchObject({
			title: "Budget question"
		});
	});
});
