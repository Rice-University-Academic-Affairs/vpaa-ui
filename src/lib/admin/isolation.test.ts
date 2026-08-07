import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("production isolation (I1-I3)", () => {
	it("public library entry does not export memory/test admin helpers", () => {
		const index = readFileSync(path.resolve("src/lib/index.ts"), "utf8");
		expect(index).not.toMatch(/MemoryAdminData/);
		expect(index).not.toMatch(/test\/identities/);
		expect(index).not.toMatch(/TEST_OWNER/);
	});

	it("memory admin data module documents test-only usage", () => {
		const source = readFileSync(path.resolve("src/lib/admin/memory-admin-data.ts"), "utf8");
		expect(source).toContain("export class MemoryAdminData");
	});

	it("does not activate memory mode from query parameters", () => {
		const layout = readFileSync(path.resolve("src/routes/admin/+layout.svelte"), "utf8");
		expect(layout).not.toMatch(/url\.searchParams.*memory/i);
		expect(layout).not.toMatch(/localStorage.*adminMode/i);
	});
});
