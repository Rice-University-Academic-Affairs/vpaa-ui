import { beforeEach, describe, expect, it } from "vitest";
import { MemoryAdminMembership } from "./membership.js";
import { RayfinAdminMembership } from "./rayfin-admin-membership.js";
import { createFakeAdminUserClient } from "./test/fake-admin-user-client.js";
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
		expect(await membership.check(TEST_NON_ADMIN)).toEqual({ allowed: false, status: 403 });
		await expect(membership.list(TEST_NON_ADMIN)).rejects.toMatchObject({ kind: "forbidden" });
	});

	it("adds unique emails and rejects duplicates / owner email (M4, M5)", async () => {
		const created = await membership.add(TEST_OWNER, "Admin@Example.EDU");
		expect(created).toMatchObject({ email: "admin@example.edu", isOwner: false });
		await expect(membership.add(TEST_OWNER, "admin@example.edu")).rejects.toMatchObject({
			kind: "conflict",
			status: 409
		});
		await expect(membership.add(TEST_OWNER, DEFAULT_OWNER_ADMIN_EMAIL)).rejects.toMatchObject({
			kind: "conflict"
		});
		await expect(membership.add(TEST_OWNER, "nope")).rejects.toMatchObject({
			kind: "validation",
			fields: { email: "Invalid email" }
		});
	});

	it("removes allowlisted admins with guards (M7-M9)", async () => {
		const created = await membership.add(TEST_OWNER, TEST_ADMIN.email);
		await expect(membership.remove(TEST_OWNER, "owner")).rejects.toMatchObject({ kind: "conflict" });
		await expect(membership.remove(TEST_ADMIN, created.id)).rejects.toMatchObject({ kind: "conflict" });
		await expect(membership.remove(TEST_OWNER, "missing")).rejects.toMatchObject({ kind: "not_found" });
		await membership.remove(TEST_OWNER, created.id);
		expect(await membership.check(TEST_ADMIN)).toEqual({ allowed: false, status: 403 });
	});

	it("seeds skip owner email and normalize stored emails", async () => {
		const seeded = new MemoryAdminMembership({
			ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL,
			seed: [
				{
					id: "1",
					email: "Invitee@Example.EDU",
					createdAt: "2020-01-01T00:00:00.000Z",
					createdBy: "Owner@Example.EDU"
				},
				{
					id: "2",
					email: DEFAULT_OWNER_ADMIN_EMAIL,
					createdAt: "2020-01-01T00:00:00.000Z",
					createdBy: "system"
				}
			]
		});
		const list = await seeded.list(TEST_OWNER);
		expect(list.items.filter((row) => !row.isOwner)).toHaveLength(1);
		expect(list.items.find((row) => row.id === "1")?.email).toBe("invitee@example.edu");
	});

	it("resolveAdminAccess maps membership statuses (A1-A3)", async () => {
		await membership.add(TEST_OWNER, TEST_INVITEE.email);
		expect(await resolveAdminAccess(null, membership)).toMatchObject({ status: "unauthenticated" });
		expect(await resolveAdminAccess(TEST_NON_ADMIN, membership)).toMatchObject({ status: "forbidden" });
		expect(await resolveAdminAccess(TEST_OWNER, membership)).toMatchObject({ status: "allowed" });
		expect(await resolveAdminAccess(TEST_INVITEE, membership)).toMatchObject({ status: "allowed" });
	});
});

describe("RayfinAdminMembership via client.data.AdminUser", () => {
	it("persists allowlist rows through the AdminUser data client", async () => {
		const { client, rows } = createFakeAdminUserClient();
		const membership = new RayfinAdminMembership(client, DEFAULT_OWNER_ADMIN_EMAIL);
		expect(await membership.check(TEST_OWNER)).toEqual({ allowed: true, status: 200 });
		expect(await membership.check(TEST_NON_ADMIN)).toEqual({ allowed: false, status: 403 });

		const created = await membership.add(TEST_OWNER, "admin@example.edu");
		expect(created.isOwner).toBe(false);
		expect(rows.has(created.id)).toBe(true);
		expect(await membership.check(TEST_ADMIN)).toEqual({ allowed: true, status: 200 });
		expect(await membership.check({ email: "Admin@Example.EDU" })).toEqual({
			allowed: true,
			status: 200
		});

		await expect(membership.add(TEST_OWNER, "ADMIN@example.edu")).rejects.toMatchObject({
			kind: "conflict",
			status: 409
		});
		await expect(membership.remove(TEST_OWNER, "owner")).rejects.toMatchObject({ kind: "conflict" });
		await expect(membership.remove(TEST_ADMIN, created.id)).rejects.toMatchObject({ kind: "conflict" });
		await membership.remove(TEST_OWNER, created.id);
		expect(rows.has(created.id)).toBe(false);
		expect(await membership.check(TEST_ADMIN)).toEqual({ allowed: false, status: 403 });
	});

	it("rejects invalid email with field map and missing ids", async () => {
		const { client } = createFakeAdminUserClient();
		const membership = new RayfinAdminMembership(client, DEFAULT_OWNER_ADMIN_EMAIL);
		await expect(membership.add(TEST_OWNER, "nope")).rejects.toMatchObject({
			kind: "validation",
			fields: { email: "Invalid email" }
		});
		await expect(membership.remove(TEST_OWNER, "missing")).rejects.toMatchObject({ kind: "not_found" });
	});

	it("maps Rayfin client failures without collapsing to forbidden on check", async () => {
		const { client } = createFakeAdminUserClient();
		client.data.AdminUser.select = () => {
			throw new Error("store down");
		};
		const membership = new RayfinAdminMembership(client, DEFAULT_OWNER_ADMIN_EMAIL);
		await expect(membership.check(TEST_ADMIN)).rejects.toMatchObject({ kind: "unexpected" });
	});

	it("lists owner plus AdminUser rows for an allowlisted caller", async () => {
		const { client } = createFakeAdminUserClient();
		const membership = new RayfinAdminMembership(client, DEFAULT_OWNER_ADMIN_EMAIL);
		await membership.add(TEST_OWNER, TEST_ADMIN.email);
		const list = await membership.list(TEST_OWNER);
		expect(list.items[0]).toMatchObject({ id: "owner", isOwner: true });
		expect(list.items.some((row) => row.email === TEST_ADMIN.email && !row.isOwner)).toBe(true);
	});

	it("pages through AdminUser rows when listing large allowlists", async () => {
		const seed = Array.from({ length: 5 }, (_, i) => ({
			id: `u${i}`,
			email: `user${i}@example.edu`,
			createdAt: "2020-01-01T00:00:00.000Z",
			createdBy: DEFAULT_OWNER_ADMIN_EMAIL
		}));
		const { client } = createFakeAdminUserClient(seed, { pageSize: 2 });
		const membership = new RayfinAdminMembership(client, DEFAULT_OWNER_ADMIN_EMAIL);
		const list = await membership.list(TEST_OWNER);
		expect(list.items.filter((row) => !row.isOwner)).toHaveLength(5);
	});

	it("forbids non-admin list/add and rejects owner email create", async () => {
		const { client } = createFakeAdminUserClient();
		const membership = new RayfinAdminMembership(client, DEFAULT_OWNER_ADMIN_EMAIL);
		await expect(membership.list(TEST_NON_ADMIN)).rejects.toMatchObject({ kind: "forbidden" });
		await expect(membership.add(TEST_NON_ADMIN, TEST_INVITEE.email)).rejects.toMatchObject({
			kind: "forbidden"
		});
		await expect(membership.add(TEST_OWNER, DEFAULT_OWNER_ADMIN_EMAIL)).rejects.toMatchObject({
			kind: "conflict"
		});
	});

	it("maps unauthorized and conflict Rayfin errors on mutate", async () => {
		const { client } = createFakeAdminUserClient();
		client.data.AdminUser.create = async () => {
			throw new Error("duplicate key unique constraint");
		};
		const membership = new RayfinAdminMembership(client, DEFAULT_OWNER_ADMIN_EMAIL);
		await expect(membership.add(TEST_OWNER, "fresh@example.edu")).rejects.toMatchObject({
			kind: "conflict",
			status: 409
		});

		client.data.AdminUser.select = () => {
			throw new Error("Unauthorized session");
		};
		await expect(membership.check(TEST_ADMIN)).rejects.toMatchObject({
			kind: "unauthorized",
			status: 401
		});
	});
});

describe("Fabric session identity mapping", () => {
	it("maps OpaqueSession email into AdminIdentity (A8, A9)", () => {
		const session = createOpaqueSession({ email: "Owner@Example.EDU" });
		expect(identityFromSession(session)).toEqual({ email: "owner@example.edu" });
		expect(sessionToAppAuth(session)).toEqual({
			authenticated: true,
			email: "owner@example.edu",
			identity: { email: "owner@example.edu" }
		});
		expect(identityFromSession(null)).toBeNull();
	});

	it("throws AdminError for unexpected kinds", () => {
		expect(new AdminError("unexpected", "x")).toMatchObject({ status: 500 });
	});
});
