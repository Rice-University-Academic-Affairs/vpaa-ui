import { cleanup, render, screen } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import ActiveFiltersHarness from "./ActiveFiltersHarness.svelte";

afterEach(() => {
	cleanup();
});

describe("DataTableActiveFilters", () => {
	it("shows the filtered count and active filter chips", () => {
		render(ActiveFiltersHarness);

		expect(screen.getByText("Showing 6")).toBeInTheDocument();
		expect(screen.getByText("Tenured")).toBeInTheDocument();
	});

	it("removes a filter chip when its remove button is clicked", async () => {
		render(ActiveFiltersHarness);

		await userEvent.click(screen.getByRole("button", { name: "Remove Status Tenured" }));

		expect(screen.queryByText("Tenured")).not.toBeInTheDocument();
	});

	it("clears all active filters", async () => {
		render(ActiveFiltersHarness);

		await userEvent.click(screen.getByRole("button", { name: "Clear all" }));

		expect(screen.queryByText("Tenured")).not.toBeInTheDocument();
	});
});
