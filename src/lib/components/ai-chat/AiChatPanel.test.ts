import { render, screen } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AiChatSession } from "$lib/ai-chat/session/create-session.svelte.js";
import AiChatPanel from "./AiChatPanel.svelte";

const threads = [
	{ id: "thread-a", title: "Alpha", preview: "Preview A", updatedAt: "2026-03-03" },
	{ id: "thread-b", title: "Beta", preview: "Preview B", updatedAt: "2026-03-02" }
];

function createMockSession(): AiChatSession {
	return {
		get chat() {
			return {
				messages: [],
				isLoading: false,
				error: null,
				sendMessage: vi.fn()
			};
		},
		get threads() {
			return threads;
		},
		get selectedThreadId() {
			return "thread-a";
		},
		get selectedThread() {
			return threads[0] ?? null;
		},
		get isReady() {
			return true;
		},
		get bootstrapError() {
			return null;
		},
		refreshThreads: vi.fn(),
		selectThread: vi.fn(),
		createThread: vi.fn(),
		deleteThread: vi.fn(),
		dispose: vi.fn()
	};
}

describe("AiChatPanel", () => {
	it("wires thread list actions to the session", async () => {
		const session = createMockSession();

		render(AiChatPanel, {
			props: {
				open: true,
				session
			}
		});

		expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();

		await userEvent.click(
			screen.getByRole("button", { name: "Beta Preview B" })
		);
		expect(session.selectThread).toHaveBeenCalledWith("thread-b");

		await userEvent.click(screen.getByRole("button", { name: "New conversation" }));
		expect(session.createThread).toHaveBeenCalled();

		const alphaThread = screen.getByRole("button", { name: /Alpha Preview A/ });
		await userEvent.hover(alphaThread);
		await userEvent.click(screen.getByRole("button", { name: "Delete Alpha" }));
		expect(session.deleteThread).toHaveBeenCalledWith("thread-a");
	});
});
