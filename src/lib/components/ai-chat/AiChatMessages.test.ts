import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { UIMessage } from "@tanstack/ai-client";
import AiChatMessages from "./AiChatMessages.svelte";

describe("AiChatMessages", () => {
	it("shows a waiting indicator while the assistant is loading", () => {
		render(AiChatMessages, {
			props: {
				messages: [
					{
						id: "user-1",
						role: "user",
						parts: [{ type: "text", content: "Hello" }]
					}
				] as UIMessage[],
				isLoading: true
			}
		});

		expect(screen.getByRole("status", { name: "Assistant is responding" })).toBeInTheDocument();
	});

	it("scrolls to the bottom when new messages arrive", async () => {
		const { rerender } = render(AiChatMessages, {
			props: {
				messages: [] as UIMessage[],
				isLoading: false
			}
		});

		const viewport = document.querySelector(
			"[data-slot='scroll-area-viewport']"
		) as HTMLElement;
		Object.defineProperty(viewport, "scrollHeight", { value: 320, configurable: true });
		viewport.scrollTop = 0;

		await rerender({
			messages: [
				{
					id: "assistant-1",
					role: "assistant",
					parts: [{ type: "text", content: "Reply" }]
				}
			] as UIMessage[],
			isLoading: false
		});

		expect(viewport.scrollTop).toBe(320);
	});
});
