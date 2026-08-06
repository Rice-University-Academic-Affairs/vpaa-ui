import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyClientTool } from "@tanstack/ai";

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
