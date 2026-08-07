import { beforeEach, describe, expect, it } from "vitest";
import { MemoryAdminMembership } from "./membership.js";
import { resolveAdminAccess } from "./access.js";
import { normalizeEmail, requireOwnerAdminEmail, resolveOwnerAdminEmail } from "./owner-config.js";
import { AdminError } from "./types.js";
import {
	DEFAULT_OWNER_ADMIN_EMAIL,
	TEST_ADMIN,
	TEST_INVITEE,
	TEST_NON_ADMIN,
	TEST_OWNER
} from "./test/identities.js";
import {
	createTrustedMembershipService,
	type MembershipStore
} from "../../../rayfin/functions/src/admin-membership.js";
import { identityFromSession, sessionToAppAuth } from "../rayfin/auth.js";
import { createOpaqueSession } from "../rayfin/test/fake-fabric.js";

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

describe("membership email allowlist", () => {
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

	it("rejects non-admin and unauthenticated callers (M6)", async () => {
		expect(await membership.check(null)).toEqual({ allowed: false, status: 401 });
		expect(await membership.check({ email: "" })).toEqual({ allowed: false, status: 401 });
		expect(await membership.check(TEST_NON_ADMIN)).toEqual({ allowed: false, status: 403 });
		await expect(membership.add(TEST_NON_ADMIN, "x@example.edu")).rejects.toBeInstanceOf(AdminError);
	});

	it("adds, rejects duplicates, and refuses owner mutation (M4, M5, M7, M8)", async () => {
		const added = await membership.add(TEST_OWNER, "Admin@Example.EDU");
		expect(added.email).toBe("admin@example.edu");
		expect(added.createdBy).toBe(TEST_OWNER.email);
		await expect(membership.add(TEST_OWNER, "admin@example.edu")).rejects.toMatchObject({
			kind: "conflict"
		});
		await expect(membership.add(TEST_OWNER, TEST_OWNER.email)).rejects.toMatchObject({
			kind: "conflict"
		});
		await expect(membership.remove(TEST_OWNER, "owner")).rejects.toMatchObject({ kind: "conflict" });
	});

	it("lets allowlisted admins manage membership by email (M9)", async () => {
		await membership.add(TEST_OWNER, TEST_ADMIN.email);
		expect(await membership.check(TEST_ADMIN)).toEqual({ allowed: true, status: 200 });
		const invite = await membership.add(TEST_ADMIN, TEST_INVITEE.email);
		expect(invite.email).toBe(TEST_INVITEE.email);
		await membership.remove(TEST_ADMIN, invite.id);
		const list = await membership.list(TEST_ADMIN);
		expect(list.items.some((row) => row.email === TEST_INVITEE.email)).toBe(false);
	});

	it("refuses self-removal", async () => {
		const added = await membership.add(TEST_OWNER, TEST_ADMIN.email);
		await expect(membership.remove(TEST_ADMIN, added.id)).rejects.toMatchObject({ kind: "conflict" });
	});

	it("resolveAdminAccess covers auth gate outcomes without bindOnLogin", async () => {
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
					createdAt: "",
					createdBy: "seed"
				}
			]
		});
		const list = await seeded.list(TEST_OWNER);
		expect(list.items.filter((row) => row.email === DEFAULT_OWNER_ADMIN_EMAIL)).toHaveLength(1);
		expect(list.items[0]?.id).toBe("owner");
	});

	it("accepts Fabric session email through the real access path (A9)", async () => {
		const session = createOpaqueSession({ email: "Owner@Example.EDU" });
		const identity = identityFromSession(session);
		expect(sessionToAppAuth(session).authenticated).toBe(true);
		expect(await resolveAdminAccess(identity, membership)).toMatchObject({
			status: "allowed",
			identity: { email: "owner@example.edu" }
		});
		const guest = identityFromSession(createOpaqueSession({ email: "guest@example.edu" }));
		expect(await resolveAdminAccess(guest, membership)).toMatchObject({ status: "forbidden" });
	});
});

describe("trusted membership helper", () => {
	function createStore() {
		const rows = new Map<string, { id: string; email: string; createdAt: string; createdBy: string }>();
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

	it("authorizes allowlisted emails without a userId bind step", async () => {
		const { store } = createStore();
		const service = createTrustedMembershipService({
			ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL,
			store
		});
		await service.add(TEST_OWNER, TEST_ADMIN.email);
		expect(await service.check(TEST_ADMIN)).toEqual({ allowed: true, status: 200 });
		expect(await service.check({ email: "Admin@Example.EDU" })).toEqual({
			allowed: true,
			status: 200
		});
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
		await expect(service.remove(TEST_ADMIN, added.id)).rejects.toMatchObject({ kind: "conflict" });
		await expect(service.remove(TEST_OWNER, "missing")).rejects.toMatchObject({ kind: "not_found" });
	});

	it("check does not collapse store list failures into forbidden", async () => {
		const service = createTrustedMembershipService({
			ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL,
			store: {
				async list() {
					throw new Error("store down");
				},
				async create() {
					throw new Error("unused");
				},
				async remove() {
					throw new Error("unused");
				},
				async update() {
					throw new Error("unused");
				}
			}
		});
		await expect(service.check(TEST_ADMIN)).rejects.toThrow("store down");
	});

	it("check still returns 403 for non-admin when store works", async () => {
		const { store } = createStore();
		const service = createTrustedMembershipService({
			ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL,
			store
		});
		expect(await service.check(TEST_NON_ADMIN)).toEqual({ allowed: false, status: 403 });
	});
});
