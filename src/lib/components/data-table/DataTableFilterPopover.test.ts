import { cleanup, render, screen } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FilterPopoverHarness from "./FilterPopoverHarness.svelte";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

beforeEach(() => {
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
		width: 120,
		height: 32,
		top: 0,
		left: 0,
		bottom: 32,
		right: 120,
		x: 0,
		y: 0,
		toJSON: () => ({})
	});
});

describe("DataTableFilterPopover", () => {
	it("toggles a status filter from the popover", async () => {
		render(FilterPopoverHarness);

		await userEvent.click(screen.getByRole("button", { name: "Filter" }));
		await userEvent.click(await screen.findByLabelText("Tenured"));

		expect(screen.getByRole("button", { name: /Filter/ })).toHaveTextContent("1");
	});
});
