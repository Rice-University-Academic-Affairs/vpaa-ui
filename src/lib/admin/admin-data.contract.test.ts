import { beforeEach, describe, expect, it } from "vitest";
import type { AdminData, AdminResources } from "./types.js";
import { MemoryAdminData } from "./memory-admin-data.js";
import { createProductSeed } from "./test/identities.js";
import { ADMIN_PAGE_SIZE } from "./conventions.js";

export const contractResources: AdminResources = {
	Product: {
		name: "Product",
		slug: "products",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "name", type: "string", nullable: false, readOnly: false, generated: false },
			{ name: "description", type: "text", nullable: true, readOnly: false, generated: false },
			{ name: "priceInCents", type: "integer", nullable: false, readOnly: false, generated: false }
		]
	}
};

export function defineAdminDataContract(name: string, factory: () => AdminData) {
	describe(`AdminData contract: ${name}`, () => {
		let data: AdminData;

		beforeEach(() => {
			data = factory();
		});

		it("creates and retrieves a record (D1)", async () => {
			const created = await data.create("Product", { name: "A", priceInCents: 100 });
			const got = await data.get("Product", created.id);
			expect(got).toMatchObject({ id: created.id, name: "A", priceInCents: 100 });
		});

		it("updates without losing unchanged values (D2)", async () => {
			const created = await data.create("Product", {
				name: "A",
				description: "keep",
				priceInCents: 100
			});
			const updated = await data.update("Product", created.id, { name: "B" });
			expect(updated).toMatchObject({ name: "B", description: "keep", priceInCents: 100 });
		});

		it("deletes a record and returns null for missing (D3, D4)", async () => {
			const created = await data.create("Product", { name: "A", priceInCents: 100 });
			await data.remove("Product", created.id);
			expect(await data.get("Product", created.id)).toBeNull();
			expect(await data.get("Product", "missing")).toBeNull();
		});

		it("sorts one scalar column both directions (D5)", async () => {
			await data.create("Product", { id: "1", name: "B", priceInCents: 2 });
			await data.create("Product", { id: "2", name: "A", priceInCents: 1 });
			const asc = await data.list("Product", { sort: { field: "name", direction: "asc" } });
			const desc = await data.list("Product", { sort: { field: "name", direction: "desc" } });
			expect(asc.items.map((i) => i.name)).toEqual(["A", "B"]);
			expect(desc.items.map((i) => i.name)).toEqual(["B", "A"]);
		});

		it("paginates 25 records with stable next/previous cursors (D6)", async () => {
			for (const row of createProductSeed(30)) {
				await data.create("Product", row);
			}
			const first = await data.list("Product", {
				limit: ADMIN_PAGE_SIZE,
				sort: { field: "id", direction: "asc" }
			});
			expect(first.items).toHaveLength(25);
			expect(first.hasNextPage).toBe(true);
			const second = await data.list("Product", {
				limit: ADMIN_PAGE_SIZE,
				cursor: first.endCursor,
				sort: { field: "id", direction: "asc" }
			});
			expect(second.items).toHaveLength(5);
			expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
		});

		it("generates missing UUID primary keys (D9)", async () => {
			const created = await data.create("Product", { name: "X", priceInCents: 1 });
			expect(created.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			);
		});
	});
}

defineAdminDataContract("MemoryAdminData", () => new MemoryAdminData({ resources: contractResources }));

describe("MemoryAdminData extras", () => {
	it("resets state between tests and returns forbidden (D7, D8)", async () => {
		const data = new MemoryAdminData({
			resources: contractResources,
			seed: { Product: createProductSeed(2) },
			forbiddenResources: ["Product"]
		});
		await expect(data.list("Product")).rejects.toMatchObject({ kind: "forbidden" });
		const open = new MemoryAdminData({
			resources: contractResources,
			seed: { Product: createProductSeed(2) }
		});
		expect((await open.list("Product")).items).toHaveLength(2);
		open.reset();
		expect((await open.list("Product")).items).toHaveLength(0);
	});
});
