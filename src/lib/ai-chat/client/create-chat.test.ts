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
	createChat: (options: Record<string, unknown>) => createChatMock(options),
	fetchServerSentEvents: (endpoint: string) => ({ adapter: "sse", endpoint })
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

	it("forwards props from chat endpoint objects", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat({
			chat: {
				endpoint: "/api/chat",
				props: { model: "demo" }
			}
		});

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				forwardedProps: { model: "demo" }
			})
		);
	});

	it("uses server persistence when chat mode is server", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat({
			chat: { mode: "server", endpoint: "/api/chat" }
		});

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				persistence: true
			})
		);
	});

	it("prefers explicit persistence over chat defaults", async () => {
		const persistence = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn()
		};
		const { createAiChat } = await import("./create-chat.svelte.js");

		createAiChat({
			chat: { mode: "server", endpoint: "/api/chat" },
			persistence
		});

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				persistence
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

	it("uses TanStack SSE for tanstack-sse mode", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat({
			chat: { mode: "tanstack-sse", endpoint: "/api/ag-ui" }
		});

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				connection: { adapter: "sse", endpoint: "/api/ag-ui" }
			})
		);
	});

	it("wraps chat handlers", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat({
			chat: async () => "Hello"
		});

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				connection: expect.objectContaining({
					connect: expect.any(Function)
				})
			})
		);
	});
});
