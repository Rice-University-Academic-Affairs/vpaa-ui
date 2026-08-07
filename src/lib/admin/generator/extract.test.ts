import { describe, expect, it } from "vitest";
import { FacultyAward } from "../../../rayfin/data/FacultyAward.js";
import { Product } from "../../../rayfin/data/Product.js";
import { AdminUser } from "../../../rayfin/data/AdminUser.js";
import { extractResources, formatResourcesModule, GeneratorError } from "./generator/extract.js";
import { entity } from "@microsoft/rayfin-core";

describe("admin generator", () => {
	it("finds entities and preserves field order (G1, G2)", () => {
		const resources = extractResources({ entities: [Product, FacultyAward, AdminUser] });
		expect(Object.keys(resources).sort()).toEqual(["AdminUser", "FacultyAward", "Product"]);
		expect(resources.Product!.fields.map((f) => f.name)).toEqual([
			"id",
			"name",
			"description",
			"priceInCents"
		]);
		expect(resources.Product!.slug).toBe("products");
		expect(resources.FacultyAward!.slug).toBe("faculty-awards");
	});

	it("maps scalar types, optionality, enums, and read-only system fields (G3-G5, M12)", () => {
		const resources = extractResources({ entities: [Product, FacultyAward, AdminUser] });
		const product = resources.Product!;
		expect(product.fields.find((f) => f.name === "id")).toMatchObject({
			type: "string",
			generated: true,
			readOnly: true,
			primaryKey: true
		});
		expect(product.fields.find((f) => f.name === "description")).toMatchObject({
			type: "text",
			nullable: true
		});
		expect(product.fields.find((f) => f.name === "priceInCents")).toMatchObject({
			type: "integer",
			nullable: false
		});
		const award = resources.FacultyAward!;
		expect(award.fields.find((f) => f.name === "status")).toMatchObject({
			type: "enum",
			enumValues: ["nominated", "awarded", "declined"]
		});
		expect(award.fields.find((f) => f.name === "createdAt")).toMatchObject({ readOnly: true });
		expect(award.fields.find((f) => f.name === "published")).toMatchObject({ type: "boolean" });
		const admin = resources.AdminUser!;
		expect(admin.fields.find((f) => f.name === "userId")).toMatchObject({ readOnly: true });
		expect(admin.fields.find((f) => f.name === "createdBy")).toMatchObject({ readOnly: true });
	});

	it("produces deterministic formatted output (G7)", () => {
		const resources = extractResources({ entities: [Product, FacultyAward, AdminUser] });
		const a = formatResourcesModule(resources);
		const b = formatResourcesModule(resources);
		expect(a).toBe(b);
		expect(a).toContain("adminResources");
		expect(a).toContain('"Product"');
	});

	it("fails clearly on unsupported constructs (G8)", () => {
		@entity()
		class Broken {}
		expect(() => extractResources({ entities: [Broken as never] })).not.toThrow();
		expect(() => extractResources({ entities: [{ name: "Nope" } as never] })).toThrow(GeneratorError);
	});
});
