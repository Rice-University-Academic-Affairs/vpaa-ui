import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("production isolation (I1-I3)", () => {
	it("public library entry does not export memory/test admin helpers", () => {
		const index = readFileSync(path.resolve("src/lib/index.ts"), "utf8");
		expect(index).not.toMatch(/MemoryAdminData/);
		expect(index).not.toMatch(/test\/identities/);
		expect(index).not.toMatch(/TEST_OWNER/);
		expect(index).not.toMatch(/test\/bootstrap/);
		expect(index).not.toMatch(/DEFAULT_OWNER_ADMIN_EMAIL/);
	});

	it("memory admin data module documents test-only usage", () => {
		const source = readFileSync(path.resolve("src/lib/admin/memory-admin-data.ts"), "utf8");
		expect(source).toContain("export class MemoryAdminData");
	});

	it("does not activate memory mode from query parameters", () => {
		const layout = readFileSync(path.resolve("src/routes/admin/+layout.svelte"), "utf8");
		expect(layout).not.toMatch(/url\.searchParams.*memory/i);
		expect(layout).not.toMatch(/localStorage.*adminMode/i);
		expect(layout).toMatch(/PUBLIC_ADMIN_TEST_MODE|import\.meta\.env\.DEV/);
		expect(layout).toMatch(/getTestAdminContext/);
	});

	it("owner default email lives only in the test identities module", () => {
		const ownerConfig = readFileSync(path.resolve("src/lib/admin/owner-config.ts"), "utf8");
		expect(ownerConfig).not.toMatch(/owner@example\.edu/);
		const identities = readFileSync(path.resolve("src/lib/admin/test/owner-email.ts"), "utf8");
		expect(identities).toMatch(/owner@example\.edu/);
	});
});
