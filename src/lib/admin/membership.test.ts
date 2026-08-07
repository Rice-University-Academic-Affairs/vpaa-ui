import { beforeEach, describe, expect, it } from "vitest";
import { MemoryAdminMembership } from "./membership.js";
import { resolveAdminAccess } from "./access.js";
import { normalizeEmail, requireOwnerAdminEmail } from "./owner-config.js";
import { AdminError } from "./types.js";
import { TEST_ADMIN, TEST_INVITEE, TEST_NON_ADMIN, TEST_OWNER } from "./test/identities.js";

describe("owner config", () => {
	it("normalizes and validates owner email (M1, M2)", () => {
		expect(normalizeEmail("Owner@Example.EDU")).toBe("owner@example.edu");
		expect(() => requireOwnerAdminEmail("")).toThrow(/missing/i);
		expect(() => requireOwnerAdminEmail("not-an-email")).toThrow(/invalid/i);
		expect(requireOwnerAdminEmail("Owner@Example.EDU")).toBe("owner@example.edu");
	});
});

describe("membership", () => {
	let membership: MemoryAdminMembership;

	beforeEach(() => {
		membership = new MemoryAdminMembership({ ownerEmail: TEST_OWNER.email });
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

	it("resolveAdminAccess covers auth gate outcomes", async () => {
		expect(await resolveAdminAccess(null, membership)).toMatchObject({ status: "unauthenticated" });
		expect(await resolveAdminAccess(TEST_NON_ADMIN, membership)).toMatchObject({ status: "forbidden" });
		expect(await resolveAdminAccess(TEST_OWNER, membership)).toMatchObject({ status: "allowed" });
	});
});
