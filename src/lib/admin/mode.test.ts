import { describe, expect, it } from "vitest";
import { isAdminTestMode } from "./mode.js";

describe("isAdminTestMode", () => {
	it("is true for DEV or PUBLIC_ADMIN_TEST_MODE", () => {
		expect(isAdminTestMode({ DEV: true })).toBe(true);
		expect(isAdminTestMode({ PUBLIC_ADMIN_TEST_MODE: "true" })).toBe(true);
		expect(isAdminTestMode({})).toBe(false);
		expect(isAdminTestMode({ PUBLIC_ADMIN_TEST_MODE: "false" })).toBe(false);
	});
});
