import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AiChatThreadList from "./AiChatThreadList.svelte";

const threads = [
	{ id: "thread-a", title: "Alpha", preview: "Preview A", updatedAt: "2026-03-03" },
	{ id: "thread-b", title: "Beta", preview: "Preview B", updatedAt: "2026-03-02" }
];

describe("AiChatThreadList", () => {
	it("calls onThreadDelete when the delete button is clicked", async () => {
		const onThreadDelete = vi.fn();

		render(AiChatThreadList, {
			props: {
				threads,
				selectedThreadId: "thread-a",
				onThreadDelete
			}
		});

		await fireEvent.click(screen.getByRole("button", { name: "Delete Alpha" }));

		expect(onThreadDelete).toHaveBeenCalledWith("thread-a");
	});
});
