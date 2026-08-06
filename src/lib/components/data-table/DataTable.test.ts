import { cleanup, fireEvent, render, screen, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DataTable from "./DataTable.svelte";
import { facultyColumns, facultyData } from "../../../test/table-fixtures.js";

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

function renderFacultyTable(
	props: Partial<{
		data: typeof facultyData;
		columns: typeof facultyColumns;
		pageSize: number;
		searchPlaceholder: string;
		emptyMessage: string;
	}> = {}
) {
	const view = render(DataTable, {
		props: {
			data: facultyData,
			columns: facultyColumns,
			pageSize: 10,
			...props
		}
	});

	return {
		...view,
		table: within(view.container)
	};
}

function getTableBodyRows(container: HTMLElement) {
	return within(container).getAllByRole("row").filter((row) => row.closest("tbody"));
}

function getVisibleFacultyNames(container: HTMLElement) {
	return getTableBodyRows(container).map(
		(row) => within(row).getAllByRole("cell")[0]?.textContent?.trim() ?? ""
	);
}

describe("DataTable", () => {
	it("renders the first page of rows", () => {
		const { table } = renderFacultyTable();

		expect(table.getByText("Page 1 of 2")).toBeInTheDocument();
		expect(getVisibleFacultyNames(table.getByRole("table"))).toHaveLength(10);
		expect(getVisibleFacultyNames(table.getByRole("table"))[0]).toBe("Dr. Elena Martinez");
		expect(getVisibleFacultyNames(table.getByRole("table"))[9]).toBe("Dr. Carlos Mendez");
	});

	it("advances to the next page when Next is clicked", async () => {
		const { table } = renderFacultyTable();

		await userEvent.click(table.getByRole("button", { name: "Next" }));

		expect(table.getByText("Page 2 of 2")).toBeInTheDocument();
		expect(getVisibleFacultyNames(table.getByRole("table"))).toHaveLength(2);
		expect(getVisibleFacultyNames(table.getByRole("table"))).toEqual([
			"Dr. Emily Foster",
			"Dr. Raj Patel"
		]);
	});

	it("returns to the previous page when Previous is clicked", async () => {
		const { table } = renderFacultyTable();

		await userEvent.click(table.getByRole("button", { name: "Next" }));
		await userEvent.click(table.getByRole("button", { name: "Previous" }));

		expect(table.getByText("Page 1 of 2")).toBeInTheDocument();
		expect(getVisibleFacultyNames(table.getByRole("table"))[0]).toBe("Dr. Elena Martinez");
		expect(getVisibleFacultyNames(table.getByRole("table"))).toHaveLength(10);
	});

	it("disables Previous on the first page and Next on the last page", async () => {
		const { table } = renderFacultyTable();

		expect(table.getByRole("button", { name: "Previous" })).toBeDisabled();
		expect(table.getByRole("button", { name: "Next" })).toBeEnabled();

		await userEvent.click(table.getByRole("button", { name: "Next" }));

		expect(table.getByRole("button", { name: "Previous" })).toBeEnabled();
		expect(table.getByRole("button", { name: "Next" })).toBeDisabled();
	});

	it("filters rows by search and resets to page 1", async () => {
		const { table } = renderFacultyTable({ searchPlaceholder: "Search faculty…" });

		await userEvent.click(table.getByRole("button", { name: "Next" }));
		expect(table.getByText("Page 2 of 2")).toBeInTheDocument();

		const searchInput = table.getByLabelText("Search faculty…");
		await fireEvent.input(searchInput, { target: { value: "Elena" } });

		expect(getVisibleFacultyNames(table.getByRole("table"))).toEqual(["Dr. Elena Martinez"]);
		expect(table.getByText(/^Page 1 of/)).toBeInTheDocument();
	});

	it("renders the sort menu trigger for sortable columns", () => {
		const { table } = renderFacultyTable();

		expect(table.getByRole("button", { name: "Name" })).toBeInTheDocument();
	});

	it("filters rows from the status filter popover", async () => {
		const { table } = renderFacultyTable();

		await userEvent.click(table.getByRole("button", { name: "Filter" }));
		await userEvent.click(await screen.findByLabelText("Tenured"));

		expect(getVisibleFacultyNames(table.getByRole("table"))).toEqual([
			"Dr. Elena Martinez",
			"Dr. James Chen",
			"Dr. Michael Okonkwo",
			"Dr. Anna Bergström",
			"Dr. Lisa Thompson",
			"Dr. Emily Foster"
		]);
		expect(table.getByText("Showing 6")).toBeInTheDocument();
	});

	it("shows the empty state when no rows match", async () => {
		const { table } = renderFacultyTable({
			searchPlaceholder: "Search faculty…",
			emptyMessage: "No faculty found."
		});

		await fireEvent.input(table.getByLabelText("Search faculty…"), {
			target: { value: "zzzz-no-match" }
		});

		expect(
			table.getByText("No results match these filters. Try clearing one.")
		).toBeInTheDocument();
	});
});
