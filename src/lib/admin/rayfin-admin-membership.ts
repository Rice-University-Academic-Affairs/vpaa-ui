import {
	AdminError,
	type AdminIdentity,
	type AdminMembershipRecord,
	type AdminMembershipService,
	type MembershipListResult
} from "./types.js";
import { isValidEmail, normalizeEmail, requireOwnerAdminEmail } from "./owner-config.js";

export type AdminUserRow = {
	id: string;
	email: string;
	createdAt: string | Date;
	createdBy: string;
};

export type AdminUserDataClient = {
	select: (fields: string[]) => {
		where: (filter: Record<string, unknown>) => {
			first: (n: number) => {
				execute: () => Promise<AdminUserRow[]>;
			};
			execute: () => Promise<AdminUserRow[]>;
		};
		orderBy: (order: Record<string, "asc" | "desc">) => {
			first: (n: number) => {
				executePaginated: () => Promise<{
					items: AdminUserRow[];
					hasNextPage: boolean;
					endCursor?: string;
				}>;
				after: (cursor: string) => {
					executePaginated: () => Promise<{
						items: AdminUserRow[];
						hasNextPage: boolean;
						endCursor?: string;
					}>;
				};
			};
		};
	};
	create: (values: Record<string, unknown>) => Promise<AdminUserRow>;
	delete: (where: { id: string }) => Promise<AdminUserRow | void>;
	findById: (id: string) => Promise<AdminUserRow | null>;
};

export type RayfinMembershipClient = {
	data: {
		AdminUser: AdminUserDataClient;
	};
};

function toIso(value: string | Date): string {
	if (value instanceof Date) return value.toISOString();
	return String(value);
}

function wrapRayfinMembershipError(error: unknown): never {
	if (error instanceof AdminError) throw error;
	const message = error instanceof Error ? error.message : "Unexpected Rayfin membership error";
	const lower = message.toLowerCase();
	if (lower.includes("unauthorized")) {
		throw new AdminError("unauthorized", "Sign in required", { status: 401 });
	}
	if (lower.includes("forbidden") || lower.includes("permission")) {
		throw new AdminError("forbidden", "This operation is not permitted.", { status: 403 });
	}
	if (lower.includes("conflict") || lower.includes("unique") || lower.includes("duplicate")) {
		throw new AdminError("conflict", message, { status: 409 });
	}
	if (lower.includes("not found") || lower.includes("notfound")) {
		throw new AdminError("not_found", message, { status: 404 });
	}
	throw new AdminError("unexpected", "Something went wrong talking to Rayfin.", { status: 500 });
}

export class RayfinAdminMembership implements AdminMembershipService {
	private readonly ownerEmail: string;

	constructor(
		private readonly client: RayfinMembershipClient,
		ownerEmail: string
	) {
		this.ownerEmail = requireOwnerAdminEmail(ownerEmail);
	}

	async check(identity: AdminIdentity | null): Promise<{ allowed: boolean; status: number }> {
		try {
			if (!identity?.email || !normalizeEmail(identity.email)) {
				return { allowed: false, status: 401 };
			}
			if (this.isOwner(identity)) return { allowed: true, status: 200 };
			const row = await this.findByEmail(identity.email);
			return row ? { allowed: true, status: 200 } : { allowed: false, status: 403 };
		} catch (error) {
			wrapRayfinMembershipError(error);
		}
	}

	async list(caller: AdminIdentity): Promise<MembershipListResult> {
		try {
			await this.assertAdmin(caller);
			const members = await this.listAllRows();
			return {
				items: [
					{
						id: "owner",
						email: this.ownerEmail,
						createdAt: "",
						createdBy: "system",
						isOwner: true
					},
					...members
						.filter((row) => normalizeEmail(row.email) !== this.ownerEmail)
						.map((row) => this.toRecord(row, false))
				]
			};
		} catch (error) {
			wrapRayfinMembershipError(error);
		}
	}

	async add(caller: AdminIdentity, email: string): Promise<AdminMembershipRecord> {
		try {
			await this.assertAdmin(caller);
			const normalized = normalizeEmail(email);
			if (!isValidEmail(normalized)) {
				throw new AdminError("validation", "Invalid email", { fields: { email: "Invalid email" } });
			}
			if (normalized === this.ownerEmail) {
				throw new AdminError("conflict", "Owner membership cannot be modified", { status: 409 });
			}
			if (await this.findByEmail(normalized)) {
				throw new AdminError("conflict", "Administrator already exists", { status: 409 });
			}
			const created = await this.client.data.AdminUser.create({
				email: normalized,
				createdAt: new Date(),
				createdBy: normalizeEmail(caller.email)
			});
			return this.toRecord(created, false);
		} catch (error) {
			wrapRayfinMembershipError(error);
		}
	}

	async remove(caller: AdminIdentity, id: string): Promise<void> {
		try {
			await this.assertAdmin(caller);
			if (id === "owner") {
				throw new AdminError("conflict", "Owner cannot be deleted", { status: 409 });
			}
			const existing = await this.client.data.AdminUser.findById(id);
			if (!existing) throw new AdminError("not_found", "Administrator not found");
			if (normalizeEmail(existing.email) === this.ownerEmail) {
				throw new AdminError("conflict", "Owner cannot be deleted", { status: 409 });
			}
			if (normalizeEmail(existing.email) === normalizeEmail(caller.email)) {
				throw new AdminError("conflict", "Administrators cannot remove themselves", { status: 409 });
			}
			await this.client.data.AdminUser.delete({ id });
		} catch (error) {
			wrapRayfinMembershipError(error);
		}
	}

	private isOwner(identity: AdminIdentity): boolean {
		return normalizeEmail(identity.email) === this.ownerEmail;
	}

	private async findByEmail(email: string): Promise<AdminUserRow | null> {
		const normalized = normalizeEmail(email);
		const rows = await this.client.data.AdminUser.select([
			"id",
			"email",
			"createdAt",
			"createdBy"
		])
			.where({ email: { eq: normalized } })
			.first(1)
			.execute();
		return rows[0] ?? null;
	}

	private async listAllRows(): Promise<AdminUserRow[]> {
		const items: AdminUserRow[] = [];
		let cursor: string | undefined;
		for (;;) {
			const builder = this.client.data.AdminUser.select([
				"id",
				"email",
				"createdAt",
				"createdBy"
			])
				.orderBy({ email: "asc" })
				.first(100);
			const page = cursor
				? await builder.after(cursor).executePaginated()
				: await builder.executePaginated();
			items.push(...page.items);
			if (!page.hasNextPage || !page.endCursor || page.endCursor === cursor) break;
			cursor = page.endCursor;
		}
		return items;
	}

	private async assertAdmin(caller: AdminIdentity): Promise<void> {
		if (!caller?.email || !normalizeEmail(caller.email)) {
			throw new AdminError("unauthorized", "Sign in required", { status: 401 });
		}
		if (this.isOwner(caller)) return;
		if (await this.findByEmail(caller.email)) return;
		throw new AdminError("forbidden", "Administrator access required", { status: 403 });
	}

	private toRecord(row: AdminUserRow, isOwner: boolean): AdminMembershipRecord {
		return {
			id: String(row.id),
			email: normalizeEmail(row.email),
			createdAt: toIso(row.createdAt),
			createdBy: normalizeEmail(row.createdBy),
			isOwner
		};
	}
}
