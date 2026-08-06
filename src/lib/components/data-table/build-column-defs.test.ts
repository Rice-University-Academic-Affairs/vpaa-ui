import { describe, expect, it } from "vitest";
import { buildColumnDefs } from "./build-column-defs.js";
import { facultyColumns, facultyData } from "../../../test/table-fixtures.js";

function findColumn(defs: ReturnType<typeof buildColumnDefs>, field: string) {
	return defs.find((entry) => "accessorKey" in entry && entry.accessorKey === field);
}

function renderCell(
	defs: ReturnType<typeof buildColumnDefs>,
	field: string,
	row: Record<string, unknown>
) {
	const column = findColumn(defs, field);
	const cell = column?.cell;
	if (!cell || typeof cell !== "function") return null;
	return cell({ row: { original: row } } as never);
}

describe("buildColumnDefs", () => {
	it("maps sortable flags and headers from column config", () => {
		const defs = buildColumnDefs(facultyColumns, facultyData);

		expect(findColumn(defs, "name")?.enableSorting).toBe(true);
		expect(findColumn(defs, "department")?.enableSorting).toBe(false);
		expect(typeof findColumn(defs, "fte")?.header).toBe("function");
		expect(findColumn(defs, "name")?.header).toBe("Name");
	});

	it("renders plain text cells for default columns", () => {
		const defs = buildColumnDefs([{ field: "department" }], facultyData);

		expect(renderCell(defs, "department", facultyData[0]!)).toBe("Computer Science");
	});

	it("formats fractional metric values with two decimal places", () => {
		const defs = buildColumnDefs([{ field: "fte", style: "metric" }], facultyData);

		expect(renderCell(defs, "fte", { fte: 0.75 })).toBeTruthy();
		expect(renderCell(defs, "fte", { fte: 1 })).toBeTruthy();
	});

	it("uses tag labels when provided", () => {
		const defs = buildColumnDefs(
			[
				{
					field: "status",
					style: "tag",
					labels: { tenured: "Tenured", "tenure-track": "T-track" }
				}
			],
			facultyData
		);

		expect(renderCell(defs, "status", { status: "tenured" })).toBeTruthy();
	});
});
