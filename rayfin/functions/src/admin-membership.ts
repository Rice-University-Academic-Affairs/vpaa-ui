import {
	isValidEmail,
	normalizeEmail,
	requireOwnerAdminEmail
} from "../../src/lib/admin/owner-config.js";

export type MembershipCaller = {
	userId: string;
	email: string;
};

export type MembershipRecord = {
	id: string;
	email: string;
	userId?: string | null;
	createdAt: string;
	createdBy: string;
	isOwner: boolean;
};

export type MembershipStore = {
	list(): Promise<Array<Omit<MembershipRecord, "isOwner">>>;
	create(row: Omit<MembershipRecord, "isOwner" | "id"> & { id?: string }): Promise<Omit<MembershipRecord, "isOwner">>;
	remove(id: string): Promise<void>;
	update(id: string, patch: Partial<Omit<MembershipRecord, "isOwner">>): Promise<Omit<MembershipRecord, "isOwner">>;
};

export function createTrustedMembershipService(options: {
	ownerEmail: string;
	store: MembershipStore;
}) {
	const ownerEmail = requireOwnerAdminEmail(options.ownerEmail);

	async function assertAdmin(caller: MembershipCaller | null) {
		if (!caller) {
			const error = new Error("Unauthorized");
			(error as Error & { status: number }).status = 401;
			throw error;
		}
		if (normalizeEmail(caller.email) === ownerEmail) return;
		const members = await options.store.list();
		const found = members.some(
			(row) =>
				row.userId === caller.userId || normalizeEmail(row.email) === normalizeEmail(caller.email)
		);
		if (!found) {
			const error = new Error("Forbidden");
			(error as Error & { status: number }).status = 403;
			throw error;
		}
	}

	return {
		async check(caller: MembershipCaller | null) {
			if (!caller) return { allowed: false, status: 401 as const };
			try {
				await assertAdmin(caller);
				return { allowed: true, status: 200 as const };
			} catch (error) {
				const status = (error as { status?: number }).status ?? 500;
				return { allowed: false, status };
			}
		},
		async list(caller: MembershipCaller) {
			await assertAdmin(caller);
			const members = await options.store.list();
			return {
				items: [
					{
						id: "owner",
						email: ownerEmail,
						userId: null,
						createdAt: "",
						createdBy: "system",
						isOwner: true
					},
					...members.map((row) => ({ ...row, email: normalizeEmail(row.email), isOwner: false }))
				]
			};
		},
		async add(caller: MembershipCaller, email: string) {
			await assertAdmin(caller);
			const normalized = normalizeEmail(email);
			if (!isValidEmail(normalized)) {
				const error = new Error("Invalid email");
				(error as Error & { status: number }).status = 400;
				throw error;
			}
			if (normalized === ownerEmail) {
				const error = new Error("Owner membership cannot be modified");
				(error as Error & { status: number }).status = 409;
				throw error;
			}
			const existing = await options.store.list();
			if (existing.some((row) => normalizeEmail(row.email) === normalized)) {
				const error = new Error("Administrator already exists");
				(error as Error & { status: number }).status = 409;
				throw error;
			}
			return options.store.create({
				email: normalized,
				userId: null,
				createdAt: new Date().toISOString(),
				createdBy: caller.email
			});
		},
		async remove(caller: MembershipCaller, id: string) {
			await assertAdmin(caller);
			if (id === "owner") {
				const error = new Error("Owner cannot be deleted");
				(error as Error & { status: number }).status = 409;
				throw error;
			}
			await options.store.remove(id);
		}
	};
}
