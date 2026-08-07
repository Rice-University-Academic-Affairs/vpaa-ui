import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminData, AdminResources } from "./types.js";
import { MemoryAdminData } from "./memory-admin-data.js";
import { RayfinAdminData, type RayfinDataClient } from "./rayfin-admin-data.js";
import { createProductSeed } from "./test/identities.js";
import { ADMIN_PAGE_SIZE } from "./conventions.js";
import { AdminError } from "./types.js";

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
	},
	AdminUser: {
		name: "AdminUser",
		slug: "admin-users",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "email", type: "string", nullable: false, readOnly: false, generated: false }
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
			const firstIds = new Set(first.items.map((item) => item.id));
			for (const item of second.items) expect(firstIds.has(item.id)).toBe(false);
			const back = await data.list("Product", {
				limit: ADMIN_PAGE_SIZE,
				sort: { field: "id", direction: "asc" }
			});
			expect(back.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id));
		});

		it("rejects a missing pagination cursor instead of rewinding (H1)", async () => {
			for (const row of createProductSeed(30)) {
				await data.create("Product", row);
			}
			await expect(
				data.list("Product", {
					limit: ADMIN_PAGE_SIZE,
					cursor: "missing-cursor",
					sort: { field: "id", direction: "asc" }
				})
			).rejects.toMatchObject({ kind: "not_found" });
		});

		it("generates missing UUID primary keys (D9)", async () => {
			const created = await data.create("Product", { name: "X", priceInCents: 1 });
			expect(created.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			);
		});

		it("forbids AdminUser mutations through the data layer (H3)", async () => {
			await expect(data.create("AdminUser", { email: "x@example.edu" })).rejects.toMatchObject({
				kind: "forbidden"
			});
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

	it("rejects unknown seed resources", () => {
		expect(
			() =>
				new MemoryAdminData({
					resources: contractResources,
					seed: { Prodcut: createProductSeed(1) } as never
				})
		).toThrow(AdminError);
	});
});

describe("RayfinAdminData SDK dispatch", () => {
	it("calls update/delete with where objects and maps GraphQL errors", async () => {
		const update = vi.fn(async (_where: { id: string }, values: Record<string, unknown>) => ({
			id: "1",
			...values
		}));
		const del = vi.fn(async (_where: { id: string }) => undefined);
		const findById = vi.fn(async () => null);
		const create = vi.fn(async (values: Record<string, unknown>) => ({ id: "1", ...values }));
		const executePaginated = vi.fn(async () => ({ items: [], hasNextPage: false }));
		const after = vi.fn(() => ({ executePaginated }));
		const first = vi.fn(() => ({ after, executePaginated }));
		const orderBy = vi.fn(() => ({ first }));
		const select = vi.fn(() => ({ orderBy }));

		const client: RayfinDataClient = {
			data: {
				Product: { select, orderBy: orderBy as never, first: first as never, findById, create, update, delete: del }
			}
		};
		const data = new RayfinAdminData(client, contractResources);
		await data.update("Product", "1", { name: "N" });
		expect(update).toHaveBeenCalledWith({ id: "1" }, { name: "N" });
		await data.remove("Product", "1");
		expect(del).toHaveBeenCalledWith({ id: "1" });

		const failing: RayfinDataClient = {
			data: {
				Product: {
					select,
					findById,
					create: async () => {
						throw new Error("GraphQL errors: permission denied");
					},
					update,
					delete: del
				}
			}
		};
		const guarded = new RayfinAdminData(failing, contractResources);
		await expect(guarded.create("Product", { name: "X" })).rejects.toMatchObject({ kind: "forbidden" });
	});
});
