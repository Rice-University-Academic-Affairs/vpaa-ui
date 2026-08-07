import { cleanup, render, screen, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SortMenuHarness from "./SortMenuHarness.svelte";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

beforeEach(() => {
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
		width: 1024,
		height: 768,
		top: 0,
		left: 0,
		bottom: 768,
		right: 1024,
		x: 0,
		y: 0,
		toJSON: () => ({})
	});
});

function getFirstFacultyName(container: HTMLElement) {
	const row = within(container).getAllByRole("row").find((entry) => entry.closest("tbody"));
	return within(row!).getAllByRole("cell")[0]?.textContent?.trim() ?? "";
}

describe("DataTableSortMenu", () => {
	it("sorts rows descending when Descending is selected", async () => {
		const view = render(SortMenuHarness);

		await userEvent.click(screen.getByRole("button", { name: "Name" }));
		await userEvent.click(await screen.findByText("Descending"));

		expect(getFirstFacultyName(view.container)).toBe("Dr. Sarah Williams");
	});
});
