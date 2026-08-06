import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AiChatView from "./AiChatView.svelte";

describe("AiChatView", () => {
	it("shows a bootstrap loading state before the session is ready", () => {
		render(AiChatView, {
			props: {
				chat: null,
				isReady: false
			}
		});

		expect(screen.getByRole("status", { name: "Assistant is responding" })).toBeInTheDocument();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});

	it("surfaces bootstrap errors and keeps the input disabled", () => {
		render(AiChatView, {
			props: {
				chat: {
					messages: [],
					isLoading: false,
					error: null,
					sendMessage: vi.fn()
				},
				isReady: true,
				bootstrapError: new Error("storage offline")
			}
		});

		expect(screen.getByText("storage offline")).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toBeDisabled();
	});

	it("shows the assistant waiting indicator while chat.isLoading is true", () => {
		render(AiChatView, {
			props: {
				chat: {
					messages: [{ id: "u1", role: "user", parts: [{ type: "text", content: "Hi" }] }],
					isLoading: true,
					error: null,
					sendMessage: vi.fn()
				},
				isReady: true
			}
		});

		expect(screen.getByRole("status", { name: "Assistant is responding" })).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toBeDisabled();
	});

	it("surfaces chat errors from the active client", () => {
		render(AiChatView, {
			props: {
				chat: {
					messages: [],
					isLoading: false,
					error: new Error("network timeout"),
					sendMessage: vi.fn()
				},
				isReady: true
			}
		});

		expect(screen.getByText("network timeout")).toBeInTheDocument();
	});
});
