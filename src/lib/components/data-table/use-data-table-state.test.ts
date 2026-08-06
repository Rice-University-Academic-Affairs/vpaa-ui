import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { deriveFilters } from "./derive-table-config.js";
import type { DataTableState } from "./use-data-table-state.svelte.js";
import DataTableStateHarness from "./DataTableStateHarness.svelte";
import { facultyColumns, facultyData } from "../../../test/table-fixtures.js";

describe("useDataTableState", () => {
	it("filters rows by search query", async () => {
		let tableState: DataTableState<(typeof facultyData)[number]> | undefined;

		render(DataTableStateHarness, {
			props: {
				rows: facultyData,
				search: { columns: ["name", "department"] },
				onState: (state) => {
					tableState = state as DataTableState<(typeof facultyData)[number]>;
				}
			}
		});

		tableState!.searchQuery = "elena";

		expect(tableState!.filteredData).toEqual([facultyData[0]]);
	});

	it("filters rows by selected column values and tracks active count", async () => {
		let tableState: DataTableState<(typeof facultyData)[number]> | undefined;
		const filters = deriveFilters(facultyColumns, facultyData);

		render(DataTableStateHarness, {
			props: {
				rows: facultyData,
				filters,
				onState: (state) => {
					tableState = state as DataTableState<(typeof facultyData)[number]>;
				}
			}
		});

		tableState!.toggleFilter("status", "tenured");
		tableState!.toggleFilter("department", "Computer Science");

		expect(tableState!.activeCount).toBe(2);
		expect(tableState!.filteredData).toEqual([facultyData[0]]);
		expect(tableState!.isFilterActive("status", "tenured")).toBe(true);
	});

	it("removes filters and clears search state", async () => {
		let tableState: DataTableState<(typeof facultyData)[number]> | undefined;
		const filters = deriveFilters(facultyColumns, facultyData);

		render(DataTableStateHarness, {
			props: {
				rows: facultyData,
				search: { columns: ["name"] },
				filters,
				onState: (state) => {
					tableState = state as DataTableState<(typeof facultyData)[number]>;
				}
			}
		});

		tableState!.searchQuery = "elena";
		tableState!.toggleFilter("status", "tenured");
		tableState!.removeFilter("status", "tenured");
		tableState!.clearSearch();
		tableState!.clearAllFilters();

		expect(tableState!.searchQuery).toBe("");
		expect(tableState!.activeCount).toBe(0);
		expect(tableState!.filteredData).toHaveLength(facultyData.length);
	});
});
