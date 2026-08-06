import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyClientTool } from "@tanstack/ai";
import { DEFAULT_CHAT_ENDPOINT } from "../constants.js";

const createChatMock = vi.fn((options: Record<string, unknown>) => ({
	_opts: options,
	stop: vi.fn(),
	dispose: vi.fn(),
	messages: []
}));

vi.mock("@tanstack/ai-svelte", () => ({
	createChat: (options: Record<string, unknown>) => createChatMock(options)
}));

describe("createAiChat", () => {
	beforeEach(() => {
		createChatMock.mockClear();
	});

	it("defaults chat to the shared endpoint", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat();

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				connection: expect.objectContaining({
					connect: expect.any(Function)
				})
			})
		);
	});

	it("forwards explicit chat endpoints", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat({ chat: "/custom/chat" });

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				connection: expect.objectContaining({
					connect: expect.any(Function)
				})
			})
		);
	});

	it("maps deprecated transport to chat", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat({ transport: "/legacy/chat" });

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				connection: expect.objectContaining({
					connect: expect.any(Function)
				})
			})
		);
	});

	it("prefers chat over deprecated transport", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat({ chat: "/api/chat", transport: "/legacy/chat" });

		const connection = createChatMock.mock.calls[0]?.[0]?.connection as {
			connect: (
				messages: unknown[],
				data: unknown,
				signal: AbortSignal,
				runContext: { threadId: string; runId: string }
			) => AsyncIterable<unknown>;
		};

		const fetchMock = vi.fn(async () => Response.json({ message: "ok" }));
		vi.stubGlobal("fetch", fetchMock);

		for await (const _chunk of connection.connect([], undefined, new AbortController().signal, {
			threadId: "thread-1",
			runId: "run-1"
		})) {
			break;
		}

		expect(fetchMock).toHaveBeenCalledWith("/api/chat", expect.any(Object));
		vi.unstubAllGlobals();
	});

	it("forwards threadId and tools", async () => {
		const tools = [{ name: "demo_tool" }] as unknown as readonly AnyClientTool[];
		const { createAiChat } = await import("./create-chat.svelte.js");

		createAiChat({
			threadId: "thread-123",
			tools
		});

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: "thread-123",
				tools
			})
		);
	});
});
