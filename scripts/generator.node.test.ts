import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { entity, many, uuid } from "@microsoft/rayfin-core";
import { AdminUser } from "../rayfin/data/core/AdminUser.js";
import { FacultyAward } from "../rayfin/data/showcase/FacultyAward.js";
import { Product } from "../rayfin/data/showcase/Product.js";
import { ProductCategory } from "../rayfin/data/showcase/ProductCategory.js";
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

	it("emits cascade and restrict child edges from @many/@one (G10)", async () => {
		const { Faculty } = await import("../rayfin/data/showcase/Faculty.js");
		const { SabbaticalCredit } = await import("../rayfin/data/showcase/SabbaticalCredit.js");
		const { ResearchGrant } = await import("../rayfin/data/showcase/ResearchGrant.js");
		const { FacultyAward } = await import("../rayfin/data/showcase/FacultyAward.js");
		const resources = extractResources({
			entities: [Faculty, SabbaticalCredit, ResearchGrant, FacultyAward]
		});
		assert.deepEqual(resources.Faculty!.children, [
			{
				childResource: "FacultyAward",
				foreignKey: "facultyId",
				policy: "restrict"
			},
			{
				childResource: "ResearchGrant",
				foreignKey: "facultyId",
				policy: "restrict"
			},
			{
				childResource: "SabbaticalCredit",
				foreignKey: "facultyId",
				policy: "cascade",
				parentField: "sabbaticalCredits"
			},
			{
				childResource: "SabbaticalCredit",
				foreignKey: "sharedWithFacultyId",
				policy: "restrict"
			}
		]);
		assert.ok(!resources.Faculty!.fields.some((f) => f.name === "sabbaticalCredits"));
		assert.ok(resources.SabbaticalCredit!.fields.some((f) => f.name === "facultyId"));
		assert.ok(resources.SabbaticalCredit!.fields.some((f) => f.name === "sharedWithFacultyId"));
	});

	it("fails when @many target has no resolvable foreign key (G11)", async () => {
		@entity()
		class OrphanChild {
			@uuid()
			id!: string;
		}
		@entity()
		class ParentWithMany {
			@uuid()
			id!: string;
			@many(() => OrphanChild as never)
			kids!: InstanceType<typeof OrphanChild>[];
		}
		assert.throws(
			() => extractResources({ entities: [ParentWithMany as never, OrphanChild as never] }),
			(err: unknown) => err instanceof GeneratorError && /foreign key/i.test(String(err))
		);
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
