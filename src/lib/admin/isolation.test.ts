import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
		expect(layout).toMatch(/isAdminTestMode|PUBLIC_ADMIN_TEST_MODE/);
		expect(layout).toMatch(/getTestAdminContext/);
	});

	it("admin routes do not statically import MemoryAdminData outside the test harness", () => {
		const layout = readFileSync(path.resolve("src/routes/admin/+layout.svelte"), "utf8");
		expect(layout).not.toMatch(/MemoryAdminData/);
		expect(layout).toMatch(/\$lib\/admin\/test\/bootstrap/);
		expect(layout).toMatch(/loadAppAuth|RayfinAdminData|RayfinAdminMembership/);
		expect(layout).not.toMatch(/getSharedAppMembership/);
	});

	it("production admin layout wires Fabric auth instead of a permanent Sign in stub", () => {
		const layout = readFileSync(path.resolve("src/routes/admin/+layout.svelte"), "utf8");
		const load = readFileSync(path.resolve("src/routes/admin/+layout.ts"), "utf8");
		expect(load).toMatch(/loadAppAuth/);
		expect(load).toMatch(/resolveAdminAccess/);
		expect(load).toMatch(/RayfinAdminMembership/);
		expect(layout).toMatch(/RayfinAdminData/);
		expect(layout).toMatch(/RayfinAdminMembership/);
		expect(layout).not.toMatch(
			/\{#if !isAdminTestMode\}[\s\S]*Sign in required[\s\S]*\{\/:else if !adminCtx\}/
		);
	});

	it("root layout uses RayfinAdminMembership in production path", () => {
		const load = readFileSync(path.resolve("src/routes/+layout.ts"), "utf8");
		expect(load).toMatch(/RayfinAdminMembership/);
		expect(load).toMatch(/getRayfinClient/);
		expect(load).not.toMatch(/getSharedAppMembership/);
		expect(load).not.toMatch(/new MemoryAdminMembership/);
	});

	it("__ADMIN_TEST__ installed once from root layout", () => {
		const root = readFileSync(path.resolve("src/routes/+layout.svelte"), "utf8");
		const admin = readFileSync(path.resolve("src/routes/admin/+layout.svelte"), "utf8");
		expect(root).toMatch(/installAdminTestWindow/);
		expect(admin).not.toMatch(/window\.__ADMIN_TEST__\s*=/);
		expect(admin).toMatch(/__ADMIN_TEST__/);
	});

	it("shared membership helper is documented as harness-only", () => {
		const source = readFileSync(path.resolve("src/lib/admin/shared-membership.ts"), "utf8");
		expect(source).toMatch(/Test\/showcase harness only/);
		expect(source).toMatch(/RayfinAdminMembership/);
	});

	it("isAdminTestMode is flag-only (not every DEV session)", () => {
		const source = readFileSync(path.resolve("src/lib/admin/mode.ts"), "utf8");
		expect(source).toMatch(/PUBLIC_ADMIN_TEST_MODE/);
		expect(source).not.toMatch(/env\.DEV/);
	});
});

describe("schema filesystem honesty", () => {
	it("registers core AdminUser and showcase ProductCategory together", () => {
		const schema = readFileSync(path.resolve("rayfin/data/schema.ts"), "utf8");
		expect(schema).toMatch(/from "\.\/core\/AdminUser/);
		expect(schema).toMatch(/from "\.\/showcase\/ProductCategory/);
		expect(schema).toMatch(/export const schema/);
		expect(schema).toMatch(/coreEntities/);
		expect(schema).toMatch(/showcaseEntities/);
	});

	it("does not keep orphan entity files at rayfin/data root", () => {
		const root = readdirSync(path.resolve("rayfin/data"));
		expect(root.filter((name) => name.endsWith(".ts"))).toEqual(["schema.ts"]);
		expect(root).toContain("core");
		expect(root).toContain("showcase");
	});

	it("removes the misleading rayfin/functions membership helper", () => {
		expect(existsSync(path.resolve("rayfin/functions"))).toBe(false);
	});
});
