import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AiChatLoadingIndicator from "./AiChatLoadingIndicator.svelte";

describe("AiChatLoadingIndicator", () => {
	it("exposes an accessible waiting status", () => {
		render(AiChatLoadingIndicator);

		expect(screen.getByRole("status", { name: "Assistant is responding" })).toHaveTextContent(
			"Thinking…"
		);
	});
});
