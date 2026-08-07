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
		if (!identity?.userId || !identity.email) return { allowed: false, status: 401 };
		if (this.isOwner(identity) || this.findMember(identity)) return { allowed: true, status: 200 };
		return { allowed: false, status: 403 };
	}

	async list(caller: AdminIdentity): Promise<MembershipListResult> {
		this.assertAdmin(caller);
		const items: AdminMembershipRecord[] = [
			{
				id: "owner",
				email: this.ownerEmail,
				userId: null,
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
			userId: null,
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
		if (
			existing.userId === caller.userId ||
			normalizeEmail(existing.email) === normalizeEmail(caller.email)
		) {
			throw new AdminError("conflict", "Administrators cannot remove themselves", { status: 409 });
		}
		this.members.delete(id);
	}

	async bindOnLogin(identity: AdminIdentity): Promise<AdminMembershipRecord | null> {
		if (!identity?.userId || !identity.email) return null;
		if (this.isOwner(identity)) return null;
		const byUser = [...this.members.values()].find(
			(row) => Boolean(row.userId) && row.userId === identity.userId
		);
		if (byUser) return { ...byUser };
		const byEmail = [...this.members.values()].find(
			(row) => row.email === normalizeEmail(identity.email) && !row.userId
		);
		if (!byEmail) return null;
		const bound = { ...byEmail, userId: identity.userId };
		this.members.set(bound.id, bound);
		return { ...bound };
	}

	private isOwner(identity: AdminIdentity): boolean {
		return normalizeEmail(identity.email) === this.ownerEmail;
	}

	private findMember(identity: AdminIdentity): AdminMembershipRecord | undefined {
		const byUser = [...this.members.values()].find(
			(row) => Boolean(row.userId) && row.userId === identity.userId
		);
		if (byUser) return byUser;
		return [...this.members.values()].find(
			(row) => !row.userId && normalizeEmail(row.email) === normalizeEmail(identity.email)
		);
	}

	private assertAdmin(caller: AdminIdentity): void {
		if (!caller?.userId || !caller.email) {
			throw new AdminError("unauthorized", "Sign in required", { status: 401 });
		}
		if (this.isOwner(caller) || this.findMember(caller)) return;
		throw new AdminError("forbidden", "Administrator access required", { status: 403 });
	}
}
