import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_OWNER_ADMIN_EMAIL, TEST_ADMIN, TEST_OWNER } from "./test/identities.js";
import {
	getSharedAppMembership,
	resetSharedAppMembershipForTests
} from "./shared-membership.js";

describe("shared app membership", () => {
	afterEach(() => {
		resetSharedAppMembershipForTests();
	});

	it("singleton preserves allowlist across getSharedAppMembership calls", async () => {
		const first = getSharedAppMembership({ ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL });
		await first.add(TEST_OWNER, TEST_ADMIN.email);
		const second = getSharedAppMembership();
		expect(second).toBe(first);
		expect(await second.check(TEST_ADMIN)).toEqual({ allowed: true, status: 200 });
		resetSharedAppMembershipForTests();
		const third = getSharedAppMembership({ ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL });
		expect(third).not.toBe(first);
		expect(await third.check(TEST_ADMIN)).toEqual({ allowed: false, status: 403 });
	});
});
