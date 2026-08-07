import { describe, expect, it } from "vitest";
import { resolveAdminAccess } from "./access.js";
import type { AdminIdentity, AdminMembershipService } from "./types.js";

function membershipWithCheck(
	check: AdminMembershipService["check"]
): AdminMembershipService {
	return {
		check,
		list: async () => ({ items: [] }),
		add: async () => {
			throw new Error("unused");
		},
		remove: async () => {
			throw new Error("unused");
		}
	};
}

describe("resolveAdminAccess", () => {
	it("treats membership 5xx as error, not forbidden", async () => {
		const identity: AdminIdentity = { email: "owner@example.edu" };
		const access = await resolveAdminAccess(
			identity,
			membershipWithCheck(async () => ({ allowed: false, status: 500 }))
		);
		expect(access).toEqual({ status: "error", identity });
		expect(access.status).not.toBe("forbidden");
	});

	it("still maps 403 to forbidden", async () => {
		const identity: AdminIdentity = { email: "guest@example.edu" };
		await expect(
			resolveAdminAccess(
				identity,
				membershipWithCheck(async () => ({ allowed: false, status: 403 }))
			)
		).resolves.toEqual({ status: "forbidden", identity });
	});
});
