import { describe, expect, it } from "vitest";
import { deriveFilters, deriveSearch } from "$lib/components/data-table/derive-table-config.js";
import { facultyColumns, facultyData } from "../../../test/table-fixtures.js";

describe("deriveSearch", () => {
	it("returns searchable columns and placeholder", () => {
		expect(deriveSearch(facultyColumns, "Search faculty…")).toEqual({
			columns: ["name", "department"],
			placeholder: "Search faculty…"
		});
	});

	it("returns undefined when no searchable columns", () => {
		expect(deriveSearch([{ field: "fte", style: "metric" }])).toBeUndefined();
	});
});

describe("deriveFilters", () => {
	it("builds filter options from distinct column values", () => {
		const filters = deriveFilters(facultyColumns, facultyData);

		expect(filters.map((filter) => filter.column)).toEqual(["department", "status"]);
		expect(filters[0]?.options.map((option) => option.value)).toContain("Computer Science");
		expect(filters[1]?.options.map((option) => option.label)).toContain("Tenured");
	});
});
