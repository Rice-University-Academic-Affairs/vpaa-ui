import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyClientTool } from "@tanstack/ai";
import { DEFAULT_CHAT_TRANSPORT } from "../constants.js";

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

	it("defaults transport to the shared chat endpoint", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat();

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				connection: { adapter: "sse", endpoint: DEFAULT_CHAT_TRANSPORT }
			})
		);
	});

	it("forwards explicit transport endpoints", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat({ transport: "/custom/chat" });

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				connection: { adapter: "sse", endpoint: "/custom/chat" }
			})
		);
	});

	it("forwards forwardedProps from transport objects", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat({
			transport: {
				endpoint: "/api/chat",
				forwardedProps: { model: "demo" }
			}
		});

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				forwardedProps: { model: "demo" }
			})
		);
	});

	it("uses server persistence when transport mode is server", async () => {
		const { createAiChat } = await import("./create-chat.svelte.js");
		createAiChat({
			transport: { mode: "server", endpoint: "/api/chat" }
		});

		expect(createChatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				persistence: true
			})
		);
	});

	it("prefers explicit persistence over transport defaults", async () => {
		const persistence = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn()
		};
		const { createAiChat } = await import("./create-chat.svelte.js");

		createAiChat({
			transport: { mode: "server", endpoint: "/api/chat" },
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
});
