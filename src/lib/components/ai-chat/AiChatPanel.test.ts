import { cleanup, render, screen } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryChatStorage } from "$lib/ai-chat/core/storage.js";
import {
	createMockChatClient,
	flushAsyncWork
} from "$lib/ai-chat/test-utils/mock-chat-client.js";
import { mountSession } from "$lib/ai-chat/test-utils/mount-session.js";
import type { AiChatSession } from "$lib/ai-chat/session/create-session.svelte.js";
import AiChatPanel from "./AiChatPanel.svelte";

const createdClients: ReturnType<typeof createMockChatClient>[] = [];

vi.mock("$lib/ai-chat/client/create-chat.svelte.js", () => ({
	createAiChat: (options: { threadId?: string; onFinish?: () => void }) => {
		const client = createMockChatClient({
			threadId: options.threadId,
			onFinish: options.onFinish
		});
		createdClients.push(client);
		return client;
	}
}));

afterEach(() => {
	cleanup();
	createdClients.length = 0;
});

describe("AiChatPanel", () => {
	let session: AiChatSession;

	beforeEach(async () => {
		const storage = createMemoryChatStorage([
			{ id: "thread-a", title: "Alpha", preview: "Preview A", updatedAt: "2026-03-03" },
			{ id: "thread-b", title: "Beta", preview: "Preview B", updatedAt: "2026-03-02" }
		]);
		session = await mountSession({ storage, threadId: "thread-a" });
	});

	it("wires thread list actions to a real session", async () => {
		render(AiChatPanel, {
			props: {
				open: true,
				session
			}
		});

		expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "Beta Preview B" }));
		await flushAsyncWork();
		expect(session.selectedThreadId).toBe("thread-b");

		await userEvent.click(screen.getByRole("button", { name: "New conversation" }));
		await flushAsyncWork();
		expect(session.threads.length).toBe(3);

		const alphaThread = screen.getByRole("button", { name: /Alpha Preview A/ });
		await userEvent.hover(alphaThread);
		await userEvent.click(screen.getByRole("button", { name: "Delete Alpha" }));
		await flushAsyncWork();
		expect(session.threads.some((thread) => thread.id === "thread-a")).toBe(false);
	});
});
