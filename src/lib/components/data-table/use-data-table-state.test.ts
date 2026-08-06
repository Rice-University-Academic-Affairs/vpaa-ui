import { describe, expect, it } from "vitest";
import { deriveFilters } from "$lib/components/data-table/derive-table-config.js";
import { facultyColumns, facultyData } from "../../../test/table-fixtures.js";

describe("faculty search filtering", () => {
	it("matches name and department fields case-insensitively", () => {
		const searchColumns = ["name", "department"] as const;
		const query = "elena";

		const matches = facultyData.filter((row) =>
			searchColumns.some((column) =>
				String(row[column]).toLowerCase().includes(query)
			)
		);

		expect(matches).toEqual([facultyData[0]]);
	});
});

describe("faculty status filtering", () => {
	it("exposes distinct status filter options", () => {
		const filters = deriveFilters(facultyColumns, facultyData);
		const statusFilter = filters.find((filter) => filter.column === "status");

		expect(statusFilter?.options.map((option) => option.value).sort()).toEqual([
			"pending",
			"tenure-track",
			"tenured"
		]);
	});
});
