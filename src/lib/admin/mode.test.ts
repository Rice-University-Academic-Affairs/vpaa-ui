import { describe, expect, it } from "vitest";
import { isAdminTestMode } from "./mode.js";

describe("isAdminTestMode", () => {
	it("is true only when PUBLIC_ADMIN_TEST_MODE is explicitly true", () => {
		expect(isAdminTestMode({ DEV: true })).toBe(false);
		expect(isAdminTestMode({ PUBLIC_ADMIN_TEST_MODE: "true" })).toBe(true);
		expect(isAdminTestMode({ DEV: true, PUBLIC_ADMIN_TEST_MODE: "true" })).toBe(true);
		expect(isAdminTestMode({})).toBe(false);
		expect(isAdminTestMode({ PUBLIC_ADMIN_TEST_MODE: "false" })).toBe(false);
	});
});
