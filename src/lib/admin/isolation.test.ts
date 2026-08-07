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
		expect(source).toMatch(/Test \/ local scaffolding only/);
		expect(source).toMatch(/RayfinAdminData/);
	});

	it("does not activate memory mode from query parameters", () => {
		const layout = readFileSync(path.resolve("src/routes/admin/+layout.svelte"), "utf8");
		expect(layout).not.toMatch(/url\.searchParams.*memory/i);
		expect(layout).not.toMatch(/localStorage.*adminMode/i);
		expect(layout).toMatch(/isAdminTestMode|PUBLIC_ADMIN_TEST_MODE|import\.meta\.env\.DEV/);
		expect(layout).toMatch(/getTestAdminContext/);
	});

	it("admin routes do not statically import MemoryAdminData outside the test harness", () => {
		const layout = readFileSync(path.resolve("src/routes/admin/+layout.svelte"), "utf8");
		expect(layout).not.toMatch(/MemoryAdminData/);
		expect(layout).toMatch(/\$lib\/admin\/test\/bootstrap/);
		expect(layout).toMatch(/loadAppAuth|RayfinAdminData|getSharedAppMembership/);
	});

	it("production admin layout wires Fabric auth instead of a permanent Sign in stub", () => {
		const layout = readFileSync(path.resolve("src/routes/admin/+layout.svelte"), "utf8");
		const load = readFileSync(path.resolve("src/routes/admin/+layout.ts"), "utf8");
		expect(load).toMatch(/loadAppAuth/);
		expect(load).toMatch(/resolveAdminAccess/);
		expect(layout).toMatch(/RayfinAdminData/);
		expect(layout).not.toMatch(
			/\{#if !isAdminTestMode\}[\s\S]*Sign in required[\s\S]*\{\/:else if !adminCtx\}/
		);
	});

	it("root layout uses shared membership singleton in production path", () => {
		const load = readFileSync(path.resolve("src/routes/+layout.ts"), "utf8");
		expect(load).toMatch(/getSharedAppMembership/);
		expect(load).not.toMatch(/new MemoryAdminMembership/);
	});

	it("__ADMIN_TEST__ installed once from root layout", () => {
		const root = readFileSync(path.resolve("src/routes/+layout.svelte"), "utf8");
		const admin = readFileSync(path.resolve("src/routes/admin/+layout.svelte"), "utf8");
		expect(root).toMatch(/installAdminTestWindow/);
		expect(admin).not.toMatch(/window\.__ADMIN_TEST__\s*=/);
		expect(admin).toMatch(/__ADMIN_TEST__/);
	});

	it("public package exports Fabric auth helpers but not the fake Fabric harness", () => {
		const index = readFileSync(path.resolve("src/lib/index.ts"), "utf8");
		expect(index).toMatch(/bootstrapAuth/);
		expect(index).toMatch(/identityFromSession/);
		expect(index).toMatch(/buildPrimaryNavigation/);
		expect(index).not.toMatch(/fake-fabric/);
		expect(index).not.toMatch(/createFakeFabricInit/);
	});

	it("owner default email lives only in the test identities module", () => {
		const ownerConfig = readFileSync(path.resolve("src/lib/admin/owner-config.ts"), "utf8");
		expect(ownerConfig).not.toMatch(/owner@example\.edu/);
		const identities = readFileSync(path.resolve("src/lib/admin/test/owner-email.ts"), "utf8");
		expect(identities).toMatch(/owner@example\.edu/);
	});
});
