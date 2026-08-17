import { describe, expect, it } from "vitest";
import {
	defaultSort,
	fieldControl,
	humanizeName,
	listColumns,
	pluralizeLabel,
	resourceSlug
} from "./conventions.js";
import type { AdminResource } from "./types.js";

const product: AdminResource = {
	name: "Product",
	slug: "products",
	fields: [
		{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
		{ name: "name", type: "string", nullable: false, readOnly: false, generated: false },
		{ name: "description", type: "text", nullable: true, readOnly: false, generated: false },
		{ name: "priceInCents", type: "integer", nullable: false, readOnly: false, generated: false },
		{ name: "createdAt", type: "datetime", nullable: false, readOnly: true, generated: false }
	]
};

describe("conventions", () => {
	it("humanizes PascalCase, camelCase, snake_case, and kebab-case (C1-C4)", () => {
		expect(humanizeName("FacultyAward")).toBe("Faculty Award");
		expect(humanizeName("facultyId")).toBe("Faculty ID");
		expect(humanizeName("created_at")).toBe("Created At");
		expect(humanizeName("faculty-award")).toBe("Faculty Award");
	});

	it("pluralizes resource labels (C5)", () => {
		expect(pluralizeLabel("FacultyAward")).toBe("Faculty Awards");
		expect(pluralizeLabel("Product")).toBe("Products");
	});

	it("builds resource slugs (G10)", () => {
		expect(resourceSlug("Product")).toBe("products");
		expect(resourceSlug("FacultyAward")).toBe("faculty-awards");
	});

	it("chooses conventional list columns (C6)", () => {
		const columns = listColumns(product);
		expect(columns.map((c) => c.name)).toEqual(["id", "name", "priceInCents", "createdAt"]);
		expect(columns.length).toBeLessThanOrEqual(6);
		expect(columns.some((c) => c.type === "text")).toBe(false);
	});

	it("chooses default ordering (C7)", () => {
		expect(defaultSort(product)).toEqual({ field: "createdAt", direction: "desc" });
		expect(
			defaultSort({
				...product,
				fields: [
					...product.fields,
					{ name: "updatedAt", type: "datetime", nullable: true, readOnly: true, generated: false }
				]
			})
		).toEqual({ field: "updatedAt", direction: "desc" });
		expect(
			defaultSort({
				name: "X",
				slug: "xes",
				fields: [{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true }]
			})
		).toEqual({ field: "id", direction: "asc" });
	});

	it("maps field controls (C8-C9)", () => {
		expect(fieldControl(product.fields[1]!)).toBe("text");
		expect(fieldControl(product.fields[2]!)).toBe("textarea");
		expect(fieldControl(product.fields[3]!)).toBe("number-integer");
		expect(
			fieldControl({ name: "rating", type: "decimal", nullable: false, readOnly: false, generated: false })
		).toBe("number-decimal");
		expect(
			fieldControl({ name: "active", type: "boolean", nullable: false, readOnly: false, generated: false })
		).toBe("checkbox");
		expect(
			fieldControl({ name: "dueDate", type: "date", nullable: true, readOnly: false, generated: false })
		).toBe("date");
		expect(fieldControl(product.fields[4]!)).toBe("datetime-local");
		expect(
			fieldControl({
				name: "status",
				type: "enum",
				nullable: false,
				readOnly: false,
				generated: false,
				enumValues: ["a", "b"]
			})
		).toBe("select");
		expect(
			fieldControl({ name: "summary", type: "string", nullable: true, readOnly: false, generated: false })
		).toBe("textarea");
	});
});
