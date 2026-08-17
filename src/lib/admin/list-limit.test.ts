import { describe, expect, it } from "vitest";
import { ADMIN_PAGE_SIZE } from "./conventions.js";
import { clampAdminListLimit } from "./list-limit.js";

describe("clampAdminListLimit", () => {
	it("defaults and clamps invalid or oversized limits", () => {
		expect(clampAdminListLimit(undefined)).toBe(ADMIN_PAGE_SIZE);
		expect(clampAdminListLimit(Number.NaN)).toBe(ADMIN_PAGE_SIZE);
		expect(clampAdminListLimit(0)).toBe(1);
		expect(clampAdminListLimit(-3)).toBe(1);
		expect(clampAdminListLimit(1000)).toBe(ADMIN_PAGE_SIZE);
		expect(clampAdminListLimit(10)).toBe(10);
	});
});
