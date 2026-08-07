import { AdminError } from "../../../src/lib/admin/types.js";
import {
	isValidEmail,
	normalizeEmail,
	requireOwnerAdminEmail
} from "../../../src/lib/admin/owner-config.js";

export type MembershipCaller = {
	email: string;
};

export type MembershipRecord = {
	id: string;
	email: string;
	createdAt: string;
	createdBy: string;
	isOwner: boolean;
};

export type MembershipStore = {
	list(): Promise<Array<Omit<MembershipRecord, "isOwner">>>;
	create(
		row: Omit<MembershipRecord, "isOwner" | "id"> & { id?: string }
	): Promise<Omit<MembershipRecord, "isOwner">>;
	remove(id: string): Promise<void>;
	update(
		id: string,
		patch: Partial<Omit<MembershipRecord, "isOwner">>
	): Promise<Omit<MembershipRecord, "isOwner">>;
};

export function createTrustedMembershipService(options: {
	ownerEmail: string;
	store: MembershipStore;
}) {
	const ownerEmail = requireOwnerAdminEmail(options.ownerEmail);

	function isOwner(caller: MembershipCaller) {
		return normalizeEmail(caller.email) === ownerEmail;
	}

	async function findByEmail(email: string) {
		const normalized = normalizeEmail(email);
		const members = await options.store.list();
		return members.find((row) => normalizeEmail(row.email) === normalized);
	}

	async function assertAdmin(caller: MembershipCaller | null) {
		if (!caller?.email || !normalizeEmail(caller.email)) {
			throw new AdminError("unauthorized", "Unauthorized", { status: 401 });
		}
		if (isOwner(caller) || (await findByEmail(caller.email))) return;
		throw new AdminError("forbidden", "Forbidden", { status: 403 });
	}

	return {
		async check(caller: MembershipCaller | null) {
			if (!caller?.email || !normalizeEmail(caller.email)) {
				return { allowed: false, status: 401 as const };
			}
			if (isOwner(caller) || (await findByEmail(caller.email))) {
				return { allowed: true, status: 200 as const };
			}
			return { allowed: false, status: 403 as const };
		},
		async list(caller: MembershipCaller) {
			await assertAdmin(caller);
			const members = await options.store.list();
			return {
				items: [
					{
						id: "owner",
						email: ownerEmail,
						createdAt: "",
						createdBy: "system",
						isOwner: true
					},
					...members
						.filter((row) => normalizeEmail(row.email) !== ownerEmail)
						.map((row) => ({ ...row, email: normalizeEmail(row.email), isOwner: false }))
				]
			};
		},
		async add(caller: MembershipCaller, email: string) {
			await assertAdmin(caller);
			const normalized = normalizeEmail(email);
			if (!isValidEmail(normalized)) {
				throw new AdminError("validation", "Invalid email", {
					status: 400,
					fields: { email: "Invalid email" }
				});
			}
			if (normalized === ownerEmail) {
				throw new AdminError("conflict", "Owner membership cannot be modified", { status: 409 });
			}
			const existing = await options.store.list();
			if (existing.some((row) => normalizeEmail(row.email) === normalized)) {
				throw new AdminError("conflict", "Administrator already exists", { status: 409 });
			}
			const created = await options.store.create({
				email: normalized,
				createdAt: new Date().toISOString(),
				createdBy: normalizeEmail(caller.email)
			});
			return { ...created, isOwner: false as const };
		},
		async remove(caller: MembershipCaller, id: string) {
			await assertAdmin(caller);
			if (id === "owner") {
				throw new AdminError("conflict", "Owner cannot be deleted", { status: 409 });
			}
			const members = await options.store.list();
			const existing = members.find((row) => row.id === id);
			if (!existing) {
				throw new AdminError("not_found", "Administrator not found", { status: 404 });
			}
			if (normalizeEmail(existing.email) === ownerEmail) {
				throw new AdminError("conflict", "Owner cannot be deleted", { status: 409 });
			}
			if (normalizeEmail(existing.email) === normalizeEmail(caller.email)) {
				throw new AdminError("conflict", "Administrators cannot remove themselves", {
					status: 409
				});
			}
			await options.store.remove(id);
		}
	};
}
