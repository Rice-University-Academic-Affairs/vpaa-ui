import {
	AdminError,
	type AdminIdentity,
	type AdminMembershipRecord,
	type AdminMembershipService,
	type MembershipListResult
} from "./types.js";
import { isValidEmail, normalizeEmail, requireOwnerAdminEmail } from "./owner-config.js";

export type MemoryMembershipOptions = {
	ownerEmail: string;
	seed?: Array<Omit<AdminMembershipRecord, "isOwner">>;
};

export class MemoryAdminMembership implements AdminMembershipService {
	private readonly ownerEmail: string;
	private readonly members = new Map<string, AdminMembershipRecord>();

	constructor(options: MemoryMembershipOptions) {
		this.ownerEmail = requireOwnerAdminEmail(options.ownerEmail);
		if (options.seed) this.applySeed(options.seed);
	}

	reset(seed: Array<Omit<AdminMembershipRecord, "isOwner">> = []): void {
		this.members.clear();
		this.applySeed(seed);
	}

	private applySeed(seed: Array<Omit<AdminMembershipRecord, "isOwner">>): void {
		for (const row of seed) {
			const email = normalizeEmail(row.email);
			if (email === this.ownerEmail) continue;
			this.members.set(row.id, {
				...row,
				email,
				createdBy: normalizeEmail(row.createdBy),
				isOwner: false
			});
		}
	}

	snapshot(): Array<Omit<AdminMembershipRecord, "isOwner">> {
		return [...this.members.values()].map(({ isOwner: _ignored, ...row }) => ({ ...row }));
	}

	async check(identity: AdminIdentity | null): Promise<{ allowed: boolean; status: number }> {
		if (!identity?.email || !normalizeEmail(identity.email)) {
			return { allowed: false, status: 401 };
		}
		if (this.isOwner(identity) || this.findByEmail(identity.email)) {
			return { allowed: true, status: 200 };
		}
		return { allowed: false, status: 403 };
	}

	async list(caller: AdminIdentity): Promise<MembershipListResult> {
		this.assertAdmin(caller);
		const items: AdminMembershipRecord[] = [
			{
				id: "owner",
				email: this.ownerEmail,
				createdAt: "",
				createdBy: "system",
				isOwner: true
			},
			...[...this.members.values()].map((row) => ({ ...row, isOwner: false }))
		];
		return { items };
	}

	async add(caller: AdminIdentity, email: string): Promise<AdminMembershipRecord> {
		this.assertAdmin(caller);
		const normalized = normalizeEmail(email);
		if (!isValidEmail(normalized)) {
			throw new AdminError("validation", "Invalid email", { fields: { email: "Invalid email" } });
		}
		if (normalized === this.ownerEmail) {
			throw new AdminError("conflict", "Owner membership cannot be modified", { status: 409 });
		}
		for (const row of this.members.values()) {
			if (row.email === normalized) {
				throw new AdminError("conflict", "Administrator already exists", { status: 409 });
			}
		}
		const record: AdminMembershipRecord = {
			id: crypto.randomUUID(),
			email: normalized,
			createdAt: new Date().toISOString(),
			createdBy: normalizeEmail(caller.email),
			isOwner: false
		};
		this.members.set(record.id, record);
		return { ...record };
	}

	async remove(caller: AdminIdentity, id: string): Promise<void> {
		this.assertAdmin(caller);
		if (id === "owner") {
			throw new AdminError("conflict", "Owner cannot be deleted", { status: 409 });
		}
		const existing = this.members.get(id);
		if (!existing) throw new AdminError("not_found", "Administrator not found");
		if (existing.email === this.ownerEmail) {
			throw new AdminError("conflict", "Owner cannot be deleted", { status: 409 });
		}
		if (normalizeEmail(existing.email) === normalizeEmail(caller.email)) {
			throw new AdminError("conflict", "Administrators cannot remove themselves", { status: 409 });
		}
		this.members.delete(id);
	}

	private isOwner(identity: AdminIdentity): boolean {
		return normalizeEmail(identity.email) === this.ownerEmail;
	}

	private findByEmail(email: string): AdminMembershipRecord | undefined {
		const normalized = normalizeEmail(email);
		return [...this.members.values()].find((row) => row.email === normalized);
	}

	private assertAdmin(caller: AdminIdentity): void {
		if (!caller?.email || !normalizeEmail(caller.email)) {
			throw new AdminError("unauthorized", "Sign in required", { status: 401 });
		}
		if (this.isOwner(caller) || this.findByEmail(caller.email)) return;
		throw new AdminError("forbidden", "Administrator access required", { status: 403 });
	}
}
