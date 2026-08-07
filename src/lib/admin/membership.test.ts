import { beforeEach, describe, expect, it } from "vitest";
import { MemoryAdminMembership } from "./membership.js";
import { resolveAdminAccess } from "./access.js";
import { normalizeEmail, requireOwnerAdminEmail, resolveOwnerAdminEmail } from "./owner-config.js";
import { AdminError } from "./types.js";
import { DEFAULT_OWNER_ADMIN_EMAIL, TEST_ADMIN, TEST_INVITEE, TEST_NON_ADMIN, TEST_OWNER } from "./test/identities.js";
import { createTrustedMembershipService, type MembershipStore } from "../../../rayfin/functions/src/admin-membership.js";

describe("owner config", () => {
	it("normalizes and validates owner email (M1, M2)", () => {
		expect(normalizeEmail("Owner@Example.EDU")).toBe("owner@example.edu");
		expect(() => requireOwnerAdminEmail("")).toThrow(/missing/i);
		expect(() => requireOwnerAdminEmail("not-an-email")).toThrow(/invalid/i);
		expect(requireOwnerAdminEmail("Owner@Example.EDU")).toBe("owner@example.edu");
	});

	it("resolveOwnerAdminEmail fails closed without a configured value", () => {
		expect(() => resolveOwnerAdminEmail(undefined)).toThrow(/missing/i);
		expect(() => resolveOwnerAdminEmail("")).toThrow(/missing/i);
		expect(resolveOwnerAdminEmail("Ops@Example.edu")).toBe("ops@example.edu");
	});
});

describe("membership", () => {
	let membership: MemoryAdminMembership;

	beforeEach(() => {
		membership = new MemoryAdminMembership({ ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL });
	});

	it("recognizes configured owner without AdminUser row (M3)", async () => {
		const check = await membership.check(TEST_OWNER);
		expect(check).toEqual({ allowed: true, status: 200 });
		const list = await membership.list(TEST_OWNER);
		expect(list.items[0]).toMatchObject({ email: TEST_OWNER.email, isOwner: true });
	});

	it("rejects non-admin, unauthenticated, and null-userId callers (M6, B3)", async () => {
		expect(await membership.check(null)).toEqual({ allowed: false, status: 401 });
		expect(await membership.check(TEST_NON_ADMIN)).toEqual({ allowed: false, status: 403 });
		await membership.add(TEST_OWNER, "pending@example.edu");
		expect(
			await membership.check({ userId: null as unknown as string, email: "attacker@evil.com" })
		).toEqual({ allowed: false, status: 401 });
		await expect(membership.add(TEST_NON_ADMIN, "x@example.edu")).rejects.toBeInstanceOf(AdminError);
	});

	it("adds, rejects duplicates, and refuses owner mutation (M4, M5, M7, M8)", async () => {
		const added = await membership.add(TEST_OWNER, "Admin@Example.EDU");
		expect(added.email).toBe("admin@example.edu");
		expect(added.createdBy).toBe(TEST_OWNER.email);
		await expect(membership.add(TEST_OWNER, "admin@example.edu")).rejects.toMatchObject({ kind: "conflict" });
		await expect(membership.add(TEST_OWNER, TEST_OWNER.email)).rejects.toMatchObject({ kind: "conflict" });
		await expect(membership.remove(TEST_OWNER, "owner")).rejects.toMatchObject({ kind: "conflict" });
	});

	it("lets non-owner admin manage membership and bind invitees (M9-M11)", async () => {
		await membership.add(TEST_OWNER, TEST_ADMIN.email);
		await membership.bindOnLogin(TEST_ADMIN);
		const invite = await membership.add(TEST_ADMIN, TEST_INVITEE.email);
		expect(invite.userId == null).toBe(true);
		const bound = await membership.bindOnLogin(TEST_INVITEE);
		expect(bound?.userId).toBe(TEST_INVITEE.userId);
		await membership.remove(TEST_ADMIN, invite.id);
		const list = await membership.list(TEST_ADMIN);
		expect(list.items.some((row) => row.email === TEST_INVITEE.email)).toBe(false);
	});

	it("requires userId once a membership row is bound", async () => {
		await membership.add(TEST_OWNER, TEST_ADMIN.email);
		await membership.bindOnLogin(TEST_ADMIN);
		expect(
			await membership.check({ userId: "different-user", email: TEST_ADMIN.email })
		).toEqual({ allowed: false, status: 403 });
		expect(await membership.check(TEST_ADMIN)).toEqual({ allowed: true, status: 200 });
	});

	it("refuses self-removal", async () => {
		const added = await membership.add(TEST_OWNER, TEST_ADMIN.email);
		await membership.bindOnLogin(TEST_ADMIN);
		await expect(membership.remove(TEST_ADMIN, added.id)).rejects.toMatchObject({ kind: "conflict" });
	});

	it("resolveAdminAccess covers auth gate outcomes", async () => {
		expect(await resolveAdminAccess(null, membership)).toMatchObject({ status: "unauthenticated" });
		expect(await resolveAdminAccess(TEST_NON_ADMIN, membership)).toMatchObject({ status: "forbidden" });
		expect(await resolveAdminAccess(TEST_OWNER, membership)).toMatchObject({ status: "allowed" });
	});

	it("skips owner-email rows from seeded membership lists", async () => {
		const seeded = new MemoryAdminMembership({
			ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL,
			seed: [
				{
					id: "ghost",
					email: DEFAULT_OWNER_ADMIN_EMAIL,
					userId: null,
					createdAt: "",
					createdBy: "seed"
				}
			]
		});
		const list = await seeded.list(TEST_OWNER);
		expect(list.items.filter((row) => row.email === DEFAULT_OWNER_ADMIN_EMAIL)).toHaveLength(1);
		expect(list.items[0]?.id).toBe("owner");
	});
});

describe("trusted membership helper", () => {
	function createStore() {
		const rows = new Map<
			string,
			{ id: string; email: string; userId?: string | null; createdAt: string; createdBy: string }
		>();
		const store: MembershipStore = {
			async list() {
				return [...rows.values()];
			},
			async create(row) {
				const id = row.id ?? crypto.randomUUID();
				const saved = { ...row, id };
				rows.set(id, saved);
				return saved;
			},
			async remove(id) {
				rows.delete(id);
			},
			async update(id, patch) {
				const existing = rows.get(id)!;
				const next = { ...existing, ...patch, id };
				rows.set(id, next);
				return next;
			}
		};
		return { rows, store };
	}

	it("mirrors memory semantics for owner/duplicate/forbidden", async () => {
		const { store } = createStore();
		const service = createTrustedMembershipService({
			ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL,
			store
		});
		expect(await service.check(null)).toEqual({ allowed: false, status: 401 });
		expect(await service.check(TEST_NON_ADMIN)).toEqual({ allowed: false, status: 403 });
		const created = await service.add(TEST_OWNER, "admin@example.edu");
		expect(created.isOwner).toBe(false);
		await expect(service.add(TEST_OWNER, "ADMIN@example.edu")).rejects.toMatchObject({
			kind: "conflict",
			status: 409
		});
		await expect(service.remove(TEST_OWNER, "owner")).rejects.toMatchObject({ kind: "conflict" });
		expect(created.email).toBe("admin@example.edu");
	});

	it("binds invitees on login and locks to userId", async () => {
		const { store } = createStore();
		const service = createTrustedMembershipService({
			ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL,
			store
		});
		const invite = await service.add(TEST_OWNER, TEST_ADMIN.email);
		expect(invite.userId).toBeNull();
		const bound = await service.bindOnLogin(TEST_ADMIN);
		expect(bound?.userId).toBe(TEST_ADMIN.userId);
		expect(
			await service.check({ userId: "different-user", email: TEST_ADMIN.email })
		).toEqual({ allowed: false, status: 403 });
		expect(await service.check(TEST_ADMIN)).toEqual({ allowed: true, status: 200 });
	});

	it("rejects invalid email with field map and self-removal", async () => {
		const { store } = createStore();
		const service = createTrustedMembershipService({
			ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL,
			store
		});
		await expect(service.add(TEST_OWNER, "nope")).rejects.toMatchObject({
			kind: "validation",
			fields: { email: "Invalid email" }
		});
		const added = await service.add(TEST_OWNER, TEST_ADMIN.email);
		await service.bindOnLogin(TEST_ADMIN);
		await expect(service.remove(TEST_ADMIN, added.id)).rejects.toMatchObject({ kind: "conflict" });
		await expect(service.remove(TEST_OWNER, "missing")).rejects.toMatchObject({ kind: "not_found" });
	});
});
