import type {
	AdminData,
	AdminRecord,
	AdminResources,
	ListRequest,
	ListResult,
	ListSort
} from "./types.js";
import { AdminError } from "./types.js";
import { ADMIN_PAGE_SIZE, defaultSort } from "./conventions.js";

type Store = Map<string, Map<string, AdminRecord>>;

export type MemoryAdminDataOptions = {
	resources: AdminResources;
	seed?: Record<string, AdminRecord[]>;
	forbiddenResources?: Set<string> | string[];
};

const MEMBERSHIP_RESOURCE = "AdminUser";

/** Test / local scaffolding only. Production admin must use RayfinAdminData. */
export class MemoryAdminData implements AdminData {
	private readonly store: Store = new Map();
	private readonly resources: AdminResources;
	private readonly forbidden: Set<string>;

	constructor(options: MemoryAdminDataOptions) {
		this.resources = options.resources;
		this.forbidden = new Set(
			Array.isArray(options.forbiddenResources)
				? options.forbiddenResources
				: options.forbiddenResources
					? [...options.forbiddenResources]
					: []
		);
		for (const name of Object.keys(options.resources)) {
			this.store.set(name, new Map());
		}
		if (options.seed) this.applySeed(options.seed);
	}

	reset(seed?: Record<string, AdminRecord[]>): void {
		for (const bucket of this.store.values()) bucket.clear();
		if (seed) this.applySeed(seed);
	}

	clearForbidden(): void {
		this.forbidden.clear();
	}

	setForbidden(resources: string[]): void {
		this.forbidden.clear();
		for (const name of resources) this.forbidden.add(name);
	}

	snapshot(): Record<string, AdminRecord[]> {
		const out: Record<string, AdminRecord[]> = {};
		for (const [resource, bucket] of this.store.entries()) {
			out[resource] = [...bucket.values()].map((row) => ({ ...row }));
		}
		return out;
	}

	async list(resource: string, request: ListRequest = {}): Promise<ListResult> {
		this.assertKnown(resource);
		this.assertMembershipGuard(resource);
		this.assertAllowed(resource);
		const def = this.resources[resource]!;
		const sort = request.sort ?? defaultSort(def);
		const limit = clampLimit(request.limit);
		const items = [...this.ensure(resource).values()].sort((a, b) => compare(a, b, sort));
		let start = 0;
		if (request.cursor) {
			const idx = items.findIndex((item) => String(item.id) === String(request.cursor));
			if (idx < 0) {
				throw new AdminError("not_found", `Pagination cursor ${request.cursor} was not found`);
			}
			start = idx + 1;
		}
		const page = items.slice(start, start + limit);
		const hasNextPage = start + limit < items.length;
		return {
			items: page.map((item) => ({ ...item })),
			hasNextPage,
			endCursor: page.length ? String(page[page.length - 1]!.id) : undefined
		};
	}

	async get(resource: string, id: string): Promise<AdminRecord | null> {
		this.assertKnown(resource);
		this.assertMembershipGuard(resource);
		this.assertAllowed(resource);
		const record = this.ensure(resource).get(String(id));
		return record ? { ...record } : null;
	}

	async create(resource: string, values: Record<string, unknown>): Promise<AdminRecord> {
		this.assertKnown(resource);
		this.assertMembershipGuard(resource);
		this.assertAllowed(resource);
		this.assertWritableValues(resource, values, "create");
		const id = typeof values.id === "string" && values.id ? values.id : crypto.randomUUID();
		const record: AdminRecord = { ...values, id };
		this.ensure(resource).set(id, record);
		return { ...record };
	}

	async update(resource: string, id: string, values: Record<string, unknown>): Promise<AdminRecord> {
		this.assertKnown(resource);
		this.assertMembershipGuard(resource);
		this.assertAllowed(resource);
		this.assertWritableValues(resource, values, "update");
		const existing = this.ensure(resource).get(String(id));
		if (!existing) throw new AdminError("not_found", `Record ${id} not found`);
		const next = { ...existing, ...values, id: String(id) };
		this.ensure(resource).set(String(id), next);
		return { ...next };
	}

	async remove(resource: string, id: string): Promise<void> {
		this.assertKnown(resource);
		this.assertMembershipGuard(resource);
		this.assertAllowed(resource);
		const bucket = this.ensure(resource);
		if (!bucket.has(String(id))) throw new AdminError("not_found", `Record ${id} not found`);
		bucket.delete(String(id));
	}

	private applySeed(seed: Record<string, AdminRecord[]>): void {
		for (const [resource, records] of Object.entries(seed)) {
			if (!this.resources[resource]) {
				throw new AdminError("not_found", `Unknown resource ${resource}`);
			}
			const bucket = this.ensure(resource);
			for (const record of records) {
				const id = String(record.id);
				bucket.set(id, { ...record, id });
			}
		}
	}

	private ensure(resource: string): Map<string, AdminRecord> {
		let bucket = this.store.get(resource);
		if (!bucket) {
			bucket = new Map();
			this.store.set(resource, bucket);
		}
		return bucket;
	}

	private assertKnown(resource: string): void {
		if (!this.resources[resource]) {
			throw new AdminError("not_found", `Unknown resource ${resource}`);
		}
	}

	private assertAllowed(resource: string): void {
		if (this.forbidden.has(resource)) {
			throw new AdminError("forbidden", `Forbidden for resource ${resource}`);
		}
	}

	private assertMembershipGuard(resource: string): void {
		if (resource === MEMBERSHIP_RESOURCE) {
			throw new AdminError(
				"forbidden",
				"AdminUser membership must go through the membership service.",
				{ status: 403 }
			);
		}
	}

	private assertWritableValues(
		resource: string,
		values: Record<string, unknown>,
		mode: "create" | "update"
	): void {
		const def = this.resources[resource]!;
		const fields: Record<string, string> = {};
		for (const field of def.fields) {
			if (field.readOnly || field.generated || field.primaryKey) continue;
			if (!(field.name in values)) {
				if (mode === "create" && !field.nullable) {
					fields[field.name] = `${field.name} is required`;
				}
				continue;
			}
			const value = values[field.name];
			if (!field.nullable && (value === null || value === undefined || value === "")) {
				fields[field.name] = `${field.name} is required`;
			}
			if (field.type === "integer" && value != null && value !== "") {
				if (typeof value !== "number" || !Number.isInteger(value)) {
					fields[field.name] = "Must be an integer";
				}
			}
		}
		if (Object.keys(fields).length > 0) {
			throw new AdminError("validation", "Validation failed", { fields, status: 400 });
		}
	}
}

function clampLimit(limit: number | undefined): number {
	if (limit == null || !Number.isFinite(limit)) return ADMIN_PAGE_SIZE;
	return Math.min(ADMIN_PAGE_SIZE, Math.max(1, Math.trunc(limit)));
}

function compare(a: AdminRecord, b: AdminRecord, sort: ListSort): number {
	const av = a[sort.field];
	const bv = b[sort.field];
	if (av == null && bv == null) return String(a.id).localeCompare(String(b.id));
	if (av == null) return sort.direction === "asc" ? -1 : 1;
	if (bv == null) return sort.direction === "asc" ? 1 : -1;
	if (av < bv) return sort.direction === "asc" ? -1 : 1;
	if (av > bv) return sort.direction === "asc" ? 1 : -1;
	return String(a.id).localeCompare(String(b.id));
}
