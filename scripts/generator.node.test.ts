import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { entity } from "@microsoft/rayfin-core";
import { AdminUser } from "../rayfin/data/AdminUser.js";
import { FacultyAward } from "../rayfin/data/FacultyAward.js";
import { Product } from "../rayfin/data/Product.js";
import { ProductCategory } from "../rayfin/data/ProductCategory.js";
import {
	extractResources,
	formatResourcesModule,
	GeneratorError,
	normalizeField
} from "../src/lib/admin/generator/extract.js";
import { checkAdminResources, generateAdminResources } from "./generate-admin.js";

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
		assert.throws(
			() => extractResources({ entities: [{ name: "Nope" } as never] }),
			(err: unknown) => err instanceof GeneratorError && /Unsupported construct/.test(String(err))
		);
		assert.throws(
			() => normalizeField("Broken", "raw", { format: undefined } as never),
			(err: unknown) =>
				err instanceof GeneratorError && err.entity === "Broken" && err.field === "raw"
		);
		assert.throws(
			() => normalizeField("Broken", "blob", { format: "blob" } as never),
			(err: unknown) =>
				err instanceof GeneratorError &&
				err.entity === "Broken" &&
				err.field === "blob" &&
				/Unsupported decorator/.test(err.message)
		);
		@entity()
		class EmptyEntity {}
		const resources = extractResources({ entities: [EmptyEntity as never] });
		assert.equal(resources.EmptyEntity?.fields.length ?? 0, 0);
	});

	it("omits relationship navigation properties and keeps scalar FKs in v1 (G6)", () => {
		const resources = extractResources({ entities: [ProductCategory] });
		assert.deepEqual(
			resources.ProductCategory!.fields.map((f) => f.name),
			["id", "name", "productId"]
		);
		assert.ok(!resources.ProductCategory!.fields.some((f) => f.name === "product"));
	});

	it("checkAdminResources rejects stale filesystem output (G9, S1)", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "admin-check-"));
		const staleFile = path.join(dir, "resources.ts");
		await generateAdminResources();
		const { readFile } = await import("node:fs/promises");
		const fresh = await readFile(
			path.resolve("src/lib/admin/generated/resources.ts"),
			"utf8"
		);
		await writeFile(staleFile, `${fresh}\n// stale\n`, "utf8");
		await assert.rejects(() => checkAdminResources({ outFile: staleFile }), /stale/i);
		await rm(dir, { recursive: true, force: true });
		await checkAdminResources();
	});
});
