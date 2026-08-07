import type { AdminData, AdminRecord, AdminResources, ListRequest, ListResult } from "./types.js";
import { AdminError } from "./types.js";
import { ADMIN_PAGE_SIZE, defaultSort } from "./conventions.js";

type EntityClient = {
	select: (fields: string[]) => {
		orderBy: (order: Record<string, "asc" | "desc">) => {
			first: (n: number) => {
				after: (cursor: string) => {
					executePaginated: () => Promise<{ items: AdminRecord[]; hasNextPage: boolean; endCursor?: string }>;
				};
				executePaginated: () => Promise<{ items: AdminRecord[]; hasNextPage: boolean; endCursor?: string }>;
			};
		};
	};
	findById: (id: string) => Promise<AdminRecord | null>;
	create: (values: Record<string, unknown>) => Promise<AdminRecord>;
	update: (id: string, values: Record<string, unknown>) => Promise<AdminRecord>;
	delete: (id: string) => Promise<void>;
};

export type RayfinDataClient = {
	data: Record<string, EntityClient>;
};

export class RayfinAdminData implements AdminData {
	constructor(
		private readonly client: RayfinDataClient,
		private readonly resources: AdminResources
	) {}

	async list(resource: string, request: ListRequest = {}): Promise<ListResult> {
		const entity = this.clientFor(resource);
		const def = this.resources[resource]!;
		const sort = request.sort ?? defaultSort(def);
		const fields = def.fields.map((field) => field.name);
		let builder = entity.select(fields).orderBy({ [sort.field]: sort.direction }).first(request.limit ?? ADMIN_PAGE_SIZE);
		const page = request.cursor
			? await builder.after(request.cursor).executePaginated()
			: await builder.executePaginated();
		return {
			items: page.items,
			hasNextPage: page.hasNextPage,
			endCursor: page.endCursor
		};
	}

	async get(resource: string, id: string): Promise<AdminRecord | null> {
		return this.clientFor(resource).findById(id);
	}

	async create(resource: string, values: Record<string, unknown>): Promise<AdminRecord> {
		return this.clientFor(resource).create(values);
	}

	async update(resource: string, id: string, values: Record<string, unknown>): Promise<AdminRecord> {
		return this.clientFor(resource).update(id, values);
	}

	async remove(resource: string, id: string): Promise<void> {
		await this.clientFor(resource).delete(id);
	}

	private clientFor(resource: string): EntityClient {
		if (!this.resources[resource]) throw new AdminError("not_found", `Unknown resource ${resource}`);
		const entity = this.client.data[resource];
		if (!entity) throw new AdminError("unexpected", `Rayfin client missing entity ${resource}`);
		return entity;
	}
}
