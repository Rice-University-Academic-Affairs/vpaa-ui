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
});
