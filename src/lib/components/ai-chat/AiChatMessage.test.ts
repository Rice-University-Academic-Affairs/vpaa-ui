import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { UIMessage } from "@tanstack/ai-client";
import AiChatMessage from "./AiChatMessage.svelte";

describe("AiChatMessage", () => {
	it("renders tool-call parts", () => {
		const message = {
			id: "assistant-1",
			role: "assistant",
			parts: [
				{
					type: "tool-call",
					name: "get_demo_stats",
					state: "complete"
				}
			]
		} as UIMessage;

		render(AiChatMessage, { props: { message } });

		expect(screen.getByText(/Used tool: get_demo_stats/)).toBeInTheDocument();
		expect(screen.getByText(/\(complete\)/)).toBeInTheDocument();
	});

	it("renders user and assistant text parts", () => {
		render(AiChatMessage, {
			props: {
				message: {
					id: "user-1",
					role: "user",
					parts: [{ type: "text", content: "Hello team" }]
				} as UIMessage
			}
		});

		expect(screen.getByText("Hello team")).toBeInTheDocument();
	});

	it("renders assistant thinking parts", () => {
		render(AiChatMessage, {
			props: {
				message: {
					id: "assistant-1",
					role: "assistant",
					parts: [{ type: "thinking", content: "Checking the budget tables" }]
				} as UIMessage
			}
		});

		expect(screen.getByText("Checking the budget tables")).toBeInTheDocument();
	});
});
