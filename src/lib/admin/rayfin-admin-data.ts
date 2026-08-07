import type {
	AdminData,
	AdminRecord,
	AdminResources,
	ListRequest,
	ListResult
} from "./types.js";
import { AdminError } from "./types.js";
import { defaultSort } from "./conventions.js";
import { clampAdminListLimit } from "./list-limit.js";

type Paginated = Promise<{ items: AdminRecord[]; hasNextPage: boolean; endCursor?: string }>;

type QueryTail = {
	after: (cursor: string) => { executePaginated: () => Paginated };
	executePaginated: () => Paginated;
};

type EntityClient = {
	select: (fields: string[]) => {
		orderBy: (order: Record<string, "asc" | "desc">) => {
			first: (n: number) => QueryTail;
		};
	};
	findById: (id: string) => Promise<AdminRecord | null>;
	create: (values: Record<string, unknown>) => Promise<AdminRecord>;
	update: (where: { id: string }, values: Record<string, unknown>) => Promise<AdminRecord>;
	delete: (where: { id: string }) => Promise<AdminRecord | void>;
};

export type RayfinDataClient = {
	data: Record<string, EntityClient>;
};

const MEMBERSHIP_RESOURCE = "AdminUser";

function wrapRayfinError(error: unknown): never {
	if (error instanceof AdminError) throw error;
	const message = error instanceof Error ? error.message : "Unexpected Rayfin error";
	const lower = message.toLowerCase();
	if (lower.includes("unauthorized")) {
		throw new AdminError("unauthorized", "Sign in required", { status: 401 });
	}
	if (lower.includes("forbidden") || lower.includes("permission")) {
		throw new AdminError("forbidden", "This operation is not permitted.", { status: 403 });
	}
	if (lower.includes("validation") || lower.includes("constraint")) {
		throw new AdminError("validation", message, { status: 400 });
	}
	if (lower.includes("not found") || lower.includes("notfound") || lower.includes("invalid cursor")) {
		throw new AdminError("not_found", message, { status: 404 });
	}
	throw new AdminError("unexpected", "Something went wrong talking to Rayfin.", { status: 500 });
}

export class RayfinAdminData implements AdminData {
	constructor(
		private readonly client: RayfinDataClient,
		private readonly resources: AdminResources
	) {}

	async list(resource: string, request: ListRequest = {}): Promise<ListResult> {
		this.assertMutableResource(resource, "read");
		try {
			const entity = this.clientFor(resource);
			const def = this.resources[resource]!;
			const sort = request.sort ?? defaultSort(def);
			const pk = def.fields.find((field) => field.primaryKey)?.name ?? "id";
			const fields = def.fields.map((field) => field.name);
			const order: Record<string, "asc" | "desc"> = {
				[sort.field]: sort.direction,
				...(sort.field === pk ? {} : { [pk]: "asc" })
			};
			const builder = entity
				.select(fields)
				.orderBy(order)
				.first(clampAdminListLimit(request.limit));
			const page = request.cursor
				? await builder.after(request.cursor).executePaginated()
				: await builder.executePaginated();
			return {
				items: page.items.map((item) => ({ ...item })),
				hasNextPage: page.hasNextPage,
				endCursor: page.endCursor
			};
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	async get(resource: string, id: string): Promise<AdminRecord | null> {
		this.assertMutableResource(resource, "read");
		try {
			return await this.clientFor(resource).findById(id);
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	async create(resource: string, values: Record<string, unknown>): Promise<AdminRecord> {
		this.assertMutableResource(resource, "write");
		try {
			return await this.clientFor(resource).create(values);
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	async update(resource: string, id: string, values: Record<string, unknown>): Promise<AdminRecord> {
		this.assertMutableResource(resource, "write");
		try {
			return await this.clientFor(resource).update({ id }, values);
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	async remove(resource: string, id: string): Promise<void> {
		this.assertMutableResource(resource, "write");
		try {
			await this.clientFor(resource).delete({ id });
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	private assertMutableResource(resource: string, _mode: "read" | "write"): void {
		if (resource === MEMBERSHIP_RESOURCE) {
			throw new AdminError(
				"forbidden",
				"AdminUser membership must go through the membership service.",
				{ status: 403 }
			);
		}
	}

	private clientFor(resource: string): EntityClient {
		if (!this.resources[resource]) throw new AdminError("not_found", `Unknown resource ${resource}`);
		const entity = this.client.data[resource];
		if (!entity) throw new AdminError("unexpected", `Rayfin client missing entity ${resource}`);
		return entity;
	}
}
