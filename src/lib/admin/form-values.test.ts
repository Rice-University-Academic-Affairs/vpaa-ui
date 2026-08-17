import { describe, expect, it } from "vitest";
import { emptyFormValues, parseFormValues, recordToFormValues } from "./form-values.js";
import { AdminError, type AdminField } from "./types.js";

const fields: AdminField[] = [
	{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
	{ name: "name", type: "string", nullable: false, readOnly: false, generated: false },
	{ name: "description", type: "text", nullable: true, readOnly: false, generated: false },
	{ name: "priceInCents", type: "integer", nullable: false, readOnly: false, generated: false },
	{ name: "rating", type: "decimal", nullable: false, readOnly: false, generated: false },
	{ name: "active", type: "boolean", nullable: false, readOnly: false, generated: false },
	{ name: "dueDate", type: "date", nullable: true, readOnly: false, generated: false },
	{ name: "publishedAt", type: "datetime", nullable: true, readOnly: false, generated: false },
	{
		name: "status",
		type: "enum",
		nullable: false,
		readOnly: false,
		generated: false,
		enumValues: ["draft", "published"]
	}
];

describe("form-values", () => {
	it("parses supported input types (F1-F6)", () => {
		const parsed = parseFormValues(
			{
				name: "Widget",
				description: "Nice",
				priceInCents: "1250",
				rating: "4.5",
				active: true,
				dueDate: "2026-08-01",
				publishedAt: "2026-08-01T12:30",
				status: "draft"
			},
			fields
		);
		expect(parsed.name).toBe("Widget");
		expect(parsed.description).toBe("Nice");
		expect(parsed.priceInCents).toBe(1250);
		expect(parsed.rating).toBe(4.5);
		expect(parsed.active).toBe(true);
		expect(parsed.dueDate).toBe("2026-08-01");
		expect(typeof parsed.publishedAt).toBe("string");
		expect(parsed.status).toBe("draft");
	});

	it("rejects invalid integer, enum values (F2, F6)", () => {
		expect(() =>
			parseFormValues({ name: "A", priceInCents: "1.5", rating: "1", active: false, status: "draft" }, fields)
		).toThrow(AdminError);
		try {
			parseFormValues({ name: "A", priceInCents: "1.5", rating: "1", active: false, status: "draft" }, fields);
		} catch (error) {
			expect(error).toBeInstanceOf(AdminError);
			expect((error as AdminError).fields?.priceInCents).toMatch(/integer/i);
		}
		expect(() =>
			parseFormValues({ name: "A", priceInCents: "1", rating: "1", active: false, status: "nope" }, fields)
		).toThrow(AdminError);
	});

	it("preserves optional empty values as null (F8)", () => {
		const parsed = parseFormValues(
			{
				name: "A",
				description: "",
				priceInCents: "1",
				rating: "1",
				active: false,
				dueDate: "",
				publishedAt: "",
				status: "draft"
			},
			fields
		);
		expect(parsed.description).toBeNull();
		expect(parsed.dueDate).toBeNull();
	});

	it("requires required fields (F8)", () => {
		try {
			parseFormValues(
				{
					name: "",
					priceInCents: "1",
					rating: "1",
					active: false,
					status: "draft"
				},
				fields
			);
			expect.fail("expected validation error");
		} catch (error) {
			expect(error).toBeInstanceOf(AdminError);
			expect((error as AdminError).fields?.name).toBeTruthy();
		}
	});

	it("round-trips record values without wiping fields (F9)", () => {
		const values = recordToFormValues(
			{
				id: "1",
				name: "Keep me",
				description: "Desc",
				priceInCents: 10,
				rating: 2,
				active: true,
				status: "published"
			},
			fields
		);
		expect(values.name).toBe("Keep me");
		expect(values.description).toBe("Desc");
		expect(emptyFormValues(fields).id).toBeUndefined();
	});
});
