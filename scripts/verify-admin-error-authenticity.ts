import { chromium } from "@playwright/test";
import { MemoryAdminMembership } from "../src/lib/admin/membership.js";
import { MemoryAdminData } from "../src/lib/admin/memory-admin-data.js";
import { resolveAdminAccess } from "../src/lib/admin/access.js";
import { adminResources, getResourceBySlug } from "../src/lib/admin/generated/resources.js";
import {
	DEFAULT_OWNER_ADMIN_EMAIL,
	TEST_NON_ADMIN,
	TEST_OWNER
} from "../src/lib/admin/test/identities.js";

type Probe = { id: string; ok: boolean; detail: string };

const probes: Probe[] = [];

function record(id: string, ok: boolean, detail: string) {
	probes.push({ id, ok, detail });
	console.log(`${ok ? "PASS" : "FAIL"} ${id}: ${detail}`);
}

async function unitLayerProbes() {
	const membership = new MemoryAdminMembership({ ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL });
	const nonAdmin = await resolveAdminAccess(TEST_NON_ADMIN, membership);
	record(
		"layer-non-admin-access",
		nonAdmin.status === "forbidden",
		`resolveAdminAccess(TEST_NON_ADMIN) => ${nonAdmin.status}`
	);

	const unauth = await resolveAdminAccess(null, membership);
	record(
		"layer-null-identity",
		unauth.status === "unauthenticated",
		`resolveAdminAccess(null) => ${unauth.status}`
	);

	const owner = await resolveAdminAccess(TEST_OWNER, membership);
	record(
		"layer-owner-allowed",
		owner.status === "allowed",
		`resolveAdminAccess(TEST_OWNER) => ${owner.status}`
	);

	const data = new MemoryAdminData({
		resources: adminResources,
		seed: { Product: [{ id: "p1", name: "A", priceInCents: 1 }] },
		forbiddenResources: ["Product"]
	});
	try {
		await data.list("Product");
		record("layer-entity-forbidden", false, "list(Product) did not throw");
	} catch (error) {
		const err = error as { kind?: string; message?: string };
		record(
			"layer-entity-forbidden",
			err.kind === "forbidden" && err.message === "Forbidden for resource Product",
			`threw kind=${err.kind} message=${JSON.stringify(err.message)}`
		);
	}

	const unknownSlug = getResourceBySlug("not-a-resource");
	record(
		"layer-unknown-slug",
		unknownSlug == null,
		`getResourceBySlug("not-a-resource") => ${unknownSlug == null ? "null" : "hit"}`
	);

	const open = new MemoryAdminData({ resources: adminResources });
	const missing = await open.get("Product", "missing-record-id");
	record("layer-missing-record", missing === null, `get(Product, missing) => ${String(missing)}`);
}

async function uiProbes() {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	await page.goto("http://127.0.0.1:5173/admin");
	await page.waitForFunction(() => Boolean(window.__ADMIN_TEST__));

	await page.evaluate(() => {
		const h = window.__ADMIN_TEST__!;
		h.resetData();
		h.setForbidden([]);
		h.setIdentity(h.identities.TEST_OWNER);
	});
	await page.goto("http://127.0.0.1:5173/admin");
	await page.waitForSelector("text=Admin Users");

	await page.evaluate(() => {
		const h = window.__ADMIN_TEST__!;
		h.setIdentity(h.identities.TEST_NON_ADMIN);
	});
	await page.goto("http://127.0.0.1:5173/admin");
	const nonAdminText = await page.getByRole("alert").innerText();
	const check = await page.evaluate(async () => {
		const h = window.__ADMIN_TEST__!;
		return h.membership.check(h.identities.TEST_NON_ADMIN);
	});
	record(
		"ui-non-admin-forbidden",
		nonAdminText.includes("Forbidden") &&
			nonAdminText.includes("You do not have administrator access.") &&
			check.allowed === false &&
			check.status === 403,
		`alert=${JSON.stringify(nonAdminText.replace(/\s+/g, " ").trim())}; membership.check=${JSON.stringify(check)}`
	);

	await page.evaluate(() => {
		const h = window.__ADMIN_TEST__!;
		h.setIdentity(h.identities.TEST_OWNER);
		h.setForbidden(["Product"]);
	});
	await page.goto("http://127.0.0.1:5173/admin/products");
	const entityText = await page.getByRole("alert").innerText();
	const thrown = await page.evaluate(async () => {
		const h = window.__ADMIN_TEST__!;
		try {
			await h.data.list("Product");
			return null;
		} catch (error) {
			return {
				kind: (error as { kind?: string }).kind,
				message: (error as { message?: string }).message
			};
		}
	});
	record(
		"ui-entity-forbidden",
		entityText.includes("Forbidden for resource Product") &&
			thrown?.kind === "forbidden" &&
			thrown.message === "Forbidden for resource Product",
		`alert=${JSON.stringify(entityText.replace(/\s+/g, " ").trim())}; data.list throw=${JSON.stringify(thrown)}`
	);

	await page.evaluate(() => {
		const h = window.__ADMIN_TEST__!;
		h.setForbidden([]);
		h.setIdentity(h.identities.TEST_OWNER);
	});
	await page.goto("http://127.0.0.1:5173/admin/not-a-resource");
	const unknownHeading = await page.getByRole("heading", { name: "Not found" }).innerText();
	const unknownAlert = await page.getByRole("alert").innerText();
	record(
		"ui-unknown-resource",
		unknownHeading === "Not found" && unknownAlert.includes('Unknown resource "not-a-resource"'),
		`heading=${JSON.stringify(unknownHeading)}; alert=${JSON.stringify(unknownAlert.replace(/\s+/g, " ").trim())}`
	);

	await page.goto("http://127.0.0.1:5173/admin/products/missing-record-id");
	const missingAlert = await page.getByRole("alert").innerText();
	const got = await page.evaluate(async () =>
		window.__ADMIN_TEST__!.data.get("Product", "missing-record-id")
	);
	record(
		"ui-missing-record",
		missingAlert.includes("Not found") && got === null,
		`alert=${JSON.stringify(missingAlert.replace(/\s+/g, " ").trim())}; data.get=${String(got)}`
	);

	await page.evaluate(() => window.__ADMIN_TEST__!.setIdentity(null));
	await page.goto("http://127.0.0.1:5173/admin/not-a-resource");
	const signIn = await page.getByText("Sign in required").first().innerText();
	const signInMsg = await page.getByText("Sign in with Rayfin to access Admin.").innerText();
	const hasButton = await page.getByRole("button", { name: "Sign in" }).count();
	const checkNull = await page.evaluate(async () => window.__ADMIN_TEST__!.membership.check(null));
	record(
		"ui-sign-in-gate",
		signIn.includes("Sign in required") && signInMsg.length > 0 && hasButton === 1 && checkNull.status === 401,
		`deep-link URL still gated by layout; check(null)=${JSON.stringify(checkNull)}`
	);

	await page.evaluate(() => {
		const h = window.__ADMIN_TEST__!;
		h.setIdentity(h.identities.TEST_OWNER);
		h.setForbidden([]);
	});
	await page.goto("http://127.0.0.1:5173/admin/products/new");
	await page.locator("#field-name").fill("Kept Name");
	await page.locator("#field-priceInCents").fill("12.5");
	await page.getByRole("button", { name: "Create" }).click();
	const validation = await page.getByText("Must be an integer").innerText();
	const kept = await page.locator("#field-name").inputValue();
	record(
		"ui-validation",
		validation === "Must be an integer" && kept === "Kept Name",
		`validation=${JSON.stringify(validation)}; kept name=${JSON.stringify(kept)}`
	);

	await browser.close();
}

await unitLayerProbes();
await uiProbes();
const failed = probes.filter((p) => !p.ok);
console.log(`\n${probes.length - failed.length}/${probes.length} authenticity probes passed`);
if (failed.length) process.exit(1);
