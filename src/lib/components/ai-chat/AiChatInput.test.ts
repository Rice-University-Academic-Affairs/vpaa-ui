import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AiChatInput from "./AiChatInput.svelte";

describe("AiChatInput", () => {
	it("submits trimmed text on Enter", async () => {
		const onSubmit = vi.fn();
		render(AiChatInput, { props: { onSubmit } });

		const textarea = screen.getByRole("textbox");
		await fireEvent.input(textarea, { target: { value: "  Budget question  " } });
		await fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

		expect(onSubmit).toHaveBeenCalledWith("Budget question");
		expect(textarea).toHaveValue("");
	});

	it("does not submit on Shift+Enter", async () => {
		const onSubmit = vi.fn();
		render(AiChatInput, { props: { onSubmit } });

		const textarea = screen.getByRole("textbox");
		await fireEvent.input(textarea, { target: { value: "Line one" } });
		await fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

		expect(onSubmit).not.toHaveBeenCalled();
		expect(textarea).toHaveValue("Line one");
	});

	it("ignores blank submissions and send clicks while disabled", async () => {
		const onSubmit = vi.fn();
		render(AiChatInput, { props: { onSubmit, disabled: true } });

		const textarea = screen.getByRole("textbox");
		await fireEvent.input(textarea, { target: { value: "   " } });
		await fireEvent.click(screen.getByRole("button", { name: "Send message" }));

		expect(onSubmit).not.toHaveBeenCalled();
	});
});
