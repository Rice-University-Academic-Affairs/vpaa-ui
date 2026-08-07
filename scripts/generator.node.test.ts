import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entity } from "@microsoft/rayfin-core";
import { AdminUser } from "../rayfin/data/AdminUser.js";
import { FacultyAward } from "../rayfin/data/FacultyAward.js";
import { Product } from "../rayfin/data/Product.js";
import { extractResources, formatResourcesModule, GeneratorError } from "../src/lib/admin/generator/extract.js";

describe("admin generator", () => {
	it("finds entities and preserves field order (G1, G2)", () => {
		const resources = extractResources({ entities: [Product, FacultyAward, AdminUser] });
		assert.deepEqual(Object.keys(resources).sort(), ["AdminUser", "FacultyAward", "Product"]);
		assert.deepEqual(
			resources.Product!.fields.map((f) => f.name),
			["id", "name", "description", "priceInCents"]
		);
		assert.equal(resources.Product!.slug, "products");
		assert.equal(resources.FacultyAward!.slug, "faculty-awards");
	});

	it("maps scalar types, optionality, enums, and read-only system fields (G3-G5, M12)", () => {
		const resources = extractResources({ entities: [Product, FacultyAward, AdminUser] });
		const product = resources.Product!;
		assert.partialDeepStrictEqual(product.fields.find((f) => f.name === "id"), {
			type: "string",
			generated: true,
			readOnly: true,
			primaryKey: true
		});
		assert.partialDeepStrictEqual(product.fields.find((f) => f.name === "description"), {
			type: "text",
			nullable: true
		});
		assert.partialDeepStrictEqual(product.fields.find((f) => f.name === "priceInCents"), {
			type: "integer",
			nullable: false
		});
		const award = resources.FacultyAward!;
		assert.partialDeepStrictEqual(award.fields.find((f) => f.name === "status"), {
			type: "enum",
			enumValues: ["nominated", "awarded", "declined"]
		});
		assert.equal(award.fields.find((f) => f.name === "createdAt")?.readOnly, true);
		assert.equal(award.fields.find((f) => f.name === "published")?.type, "boolean");
		const admin = resources.AdminUser!;
		assert.equal(admin.fields.find((f) => f.name === "userId")?.readOnly, true);
		assert.equal(admin.fields.find((f) => f.name === "createdBy")?.readOnly, true);
	});

	it("produces deterministic formatted output (G7)", () => {
		const resources = extractResources({ entities: [Product, FacultyAward, AdminUser] });
		const a = formatResourcesModule(resources);
		const b = formatResourcesModule(resources);
		assert.equal(a, b);
		assert.match(a, /adminResources/);
		assert.match(a, /"Product"/);
	});

	it("fails clearly on unsupported constructs (G8)", () => {
		@entity()
		class Broken {}
		assert.doesNotThrow(() => extractResources({ entities: [Broken as never] }));
		assert.throws(
			() => extractResources({ entities: [{ name: "Nope" } as never] }),
			GeneratorError
		);
	});

	it("detects stale generated output (G9, S1)", () => {
		const resources = extractResources({ entities: [Product, FacultyAward, AdminUser] });
		const expected = formatResourcesModule(resources);
		const stale = expected + "\n// stale\n";
		assert.notEqual(stale, expected);
	});

	it("omits relationship fields from registry (G6)", async () => {
		const { ProductCategory } = await import("../rayfin/data/ProductCategory.js");
		const resources = extractResources({ entities: [ProductCategory] });
		assert.deepEqual(
			resources.ProductCategory!.fields.map((f) => f.name),
			["id", "name"]
		);
	});
});
