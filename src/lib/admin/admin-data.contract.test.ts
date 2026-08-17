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
			await expect(data.list("AdminUser")).rejects.toMatchObject({ kind: "forbidden" });
			await expect(data.get("AdminUser", "x")).rejects.toMatchObject({ kind: "forbidden" });
			await expect(data.update("AdminUser", "x", { email: "y@example.edu" })).rejects.toMatchObject({
				kind: "forbidden"
			});
			await expect(data.remove("AdminUser", "x")).rejects.toMatchObject({ kind: "forbidden" });
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

	it("normalizes numeric seed ids for cursor equality and validates required fields", async () => {
		const data = new MemoryAdminData({
			resources: contractResources,
			seed: {
				Product: [{ id: 1 as unknown as string, name: "A", priceInCents: 1 }]
			}
		});
		const page = await data.list("Product", { limit: 1, sort: { field: "id", direction: "asc" } });
		expect(page.endCursor).toBe("1");
		const next = await data.list("Product", {
			limit: 1,
			cursor: page.endCursor,
			sort: { field: "id", direction: "asc" }
		});
		expect(next.items).toHaveLength(0);
		await expect(data.create("Product", { priceInCents: 1 })).rejects.toMatchObject({
			kind: "validation",
			fields: { name: "name is required" }
		});
		await expect(data.update("Product", "missing", { name: "X" })).rejects.toMatchObject({
			kind: "not_found"
		});
	});

	it("clamps invalid list limits", async () => {
		const data = new MemoryAdminData({
			resources: contractResources,
			seed: { Product: createProductSeed(5) }
		});
		const zero = await data.list("Product", { limit: 0 });
		expect(zero.items).toHaveLength(1);
		const huge = await data.list("Product", { limit: 1000 });
		expect(huge.items).toHaveLength(5);
	});
});

function createInMemoryRayfinClient(resources: AdminResources): RayfinDataClient {
	const store = new Map<string, Map<string, Record<string, unknown>>>();
	for (const name of Object.keys(resources)) store.set(name, new Map());

	function entityClient(resource: string) {
		const bucket = () => store.get(resource)!;
		return {
			select(_fields: string[]) {
				return {
					orderBy(order: Record<string, "asc" | "desc">) {
						return {
							first(n: number) {
								const run = async (cursor?: string) => {
									const [[field, direction]] = Object.entries(order);
									const items = [...bucket().values()].sort((a, b) => {
										const av = a[field!];
										const bv = b[field!];
										if (av === bv) return String(a.id).localeCompare(String(b.id));
										if ((av as never) < (bv as never)) return direction === "asc" ? -1 : 1;
										return direction === "asc" ? 1 : -1;
									});
									let start = 0;
									if (cursor) {
										const idx = items.findIndex((item) => String(item.id) === cursor);
										if (idx < 0) throw new Error("invalid cursor");
										start = idx + 1;
									}
									const page = items.slice(start, start + n);
									return {
										items: page.map((item) => ({ ...item })),
										hasNextPage: start + n < items.length,
										endCursor: page.length ? String(page[page.length - 1]!.id) : undefined
									};
								};
								return {
									after: (cursor: string) => ({ executePaginated: () => run(cursor) }),
									executePaginated: () => run()
								};
							}
						};
					}
				};
			},
			findById: async (id: string) => {
				const row = bucket().get(id);
				return row ? { ...row } : null;
			},
			create: async (values: Record<string, unknown>) => {
				const id = typeof values.id === "string" && values.id ? values.id : crypto.randomUUID();
				const record = { ...values, id };
				bucket().set(id, record);
				return { ...record };
			},
			update: async (where: { id: string }, values: Record<string, unknown>) => {
				const existing = bucket().get(where.id);
				if (!existing) throw new Error("not found");
				const next = { ...existing, ...values, id: where.id };
				bucket().set(where.id, next);
				return { ...next };
			},
			delete: async (where: { id: string }) => {
				if (!bucket().has(where.id)) throw new Error("not found");
				bucket().delete(where.id);
			}
		};
	}

	const data: RayfinDataClient["data"] = {};
	for (const name of Object.keys(resources)) {
		if (name === "AdminUser") continue;
		data[name] = entityClient(name);
	}
	return { data };
}

defineAdminDataContract(
	"RayfinAdminData in-memory client",
	() => new RayfinAdminData(createInMemoryRayfinClient(contractResources), contractResources)
);

describe("RayfinAdminData SDK dispatch", () => {
	it("calls update/delete with where objects and maps GraphQL errors", async () => {
		const update = vi.fn(async (_where: { id: string }, values: Record<string, unknown>) => ({
			id: "1",
			...values
		}));
		const del = vi.fn(async (_where: { id: string }) => undefined);
		const findById = vi.fn(async (id: string) => ({ id, name: "N" }));
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
		await expect(
			new RayfinAdminData(
				{
					data: {
						Product: {
							select,
							findById,
							create: async () => {
								throw new Error("GraphQL errors: unauthorized");
							},
							update,
							delete: del
						}
					}
				},
				contractResources
			).create("Product", { name: "X" })
		).rejects.toMatchObject({ kind: "unauthorized", status: 401 });
		await expect(
			new RayfinAdminData(
				{
					data: {
						Product: {
							select,
							findById,
							create: async () => {
								throw new Error("GraphQL errors: internal failure");
							},
							update,
							delete: del
						}
					}
				},
				contractResources
			).create("Product", { name: "X" })
		).rejects.toMatchObject({ kind: "unexpected" });
	});

	it("maps unauthorized distinctly from forbidden", async () => {
		const findById = vi.fn(async () => null);
		const create = vi.fn(async (values: Record<string, unknown>) => ({ id: "1", ...values }));
		const update = vi.fn(async () => ({ id: "1" }));
		const del = vi.fn(async () => undefined);
		const executePaginated = vi.fn(async () => ({ items: [], hasNextPage: false }));
		const after = vi.fn(() => ({ executePaginated }));
		const first = vi.fn(() => ({ after, executePaginated }));
		const orderBy = vi.fn(() => ({ first }));
		const select = vi.fn(() => ({ orderBy }));
		const base = { select, findById, create, update, delete: del };

		await expect(
			new RayfinAdminData(
				{
					data: {
						Product: {
							...base,
							create: async () => {
								throw new Error("unauthorized");
							}
						}
					}
				},
				contractResources
			).create("Product", { name: "X" })
		).rejects.toMatchObject({ kind: "unauthorized" });

		await expect(
			new RayfinAdminData(
				{
					data: {
						Product: {
							...base,
							create: async () => {
								throw new Error("permission denied");
							}
						}
					}
				},
				contractResources
			).create("Product", { name: "X" })
		).rejects.toMatchObject({ kind: "forbidden" });
	});

	it("clamps list limit before first()", async () => {
		const executePaginated = vi.fn(async () => ({ items: [], hasNextPage: false }));
		const after = vi.fn(() => ({ executePaginated }));
		const first = vi.fn(() => ({ after, executePaginated }));
		const orderBy = vi.fn(() => ({ first }));
		const select = vi.fn(() => ({ orderBy }));
		const data = new RayfinAdminData(
			{
				data: {
					Product: {
						select,
						findById: async () => null,
						create: async (values) => ({ id: "1", ...values }),
						update: async (_where, values) => ({ id: "1", ...values }),
						delete: async () => undefined
					}
				}
			},
			contractResources
		);
		await data.list("Product", { limit: 1000 });
		expect(first).toHaveBeenCalledWith(25);
		await data.list("Product", { limit: 0 });
		expect(first).toHaveBeenCalledWith(1);
	});
});
