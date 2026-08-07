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
		this.assertAllowed(resource);
		const def = this.resources[resource]!;
		const sort = request.sort ?? defaultSort(def);
		const limit = request.limit ?? ADMIN_PAGE_SIZE;
		const items = [...this.ensure(resource).values()].sort((a, b) => compare(a, b, sort));
		let start = 0;
		if (request.cursor) {
			const idx = items.findIndex((item) => item.id === request.cursor);
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
		this.assertAllowed(resource);
		const record = this.ensure(resource).get(id);
		return record ? { ...record } : null;
	}

	async create(resource: string, values: Record<string, unknown>): Promise<AdminRecord> {
		this.assertKnown(resource);
		this.assertMembershipGuard(resource);
		this.assertAllowed(resource);
		const id = typeof values.id === "string" && values.id ? values.id : crypto.randomUUID();
		const record: AdminRecord = { ...values, id };
		this.ensure(resource).set(id, record);
		return { ...record };
	}

	async update(resource: string, id: string, values: Record<string, unknown>): Promise<AdminRecord> {
		this.assertKnown(resource);
		this.assertMembershipGuard(resource);
		this.assertAllowed(resource);
		const existing = this.ensure(resource).get(id);
		if (!existing) throw new AdminError("not_found", `Record ${id} not found`);
		const next = { ...existing, ...values, id };
		this.ensure(resource).set(id, next);
		return { ...next };
	}

	async remove(resource: string, id: string): Promise<void> {
		this.assertKnown(resource);
		this.assertMembershipGuard(resource);
		this.assertAllowed(resource);
		const bucket = this.ensure(resource);
		if (!bucket.has(id)) throw new AdminError("not_found", `Record ${id} not found`);
		bucket.delete(id);
	}

	private applySeed(seed: Record<string, AdminRecord[]>): void {
		for (const [resource, records] of Object.entries(seed)) {
			if (!this.resources[resource]) {
				throw new AdminError("not_found", `Unknown resource ${resource}`);
			}
			const bucket = this.ensure(resource);
			for (const record of records) {
				bucket.set(String(record.id), { ...record });
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
