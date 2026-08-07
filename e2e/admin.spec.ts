import { expect, test, type Page } from "@playwright/test";

async function waitForAdminHarness(page: Page) {
	await page.goto("/admin");
	await page.waitForFunction(() => Boolean(window.__ADMIN_TEST__));
}

async function resetAsOwner(page: Page) {
	await waitForAdminHarness(page);
	await page.evaluate(() => {
		const harness = window.__ADMIN_TEST__!;
		harness.resetData();
		harness.setForbidden([]);
		harness.setIdentity(harness.identities.TEST_OWNER);
	});
	await page.goto("/admin");
	await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
}

test.describe("Admin application E2E", () => {
	test.beforeEach(async ({ page }) => {
		await resetAsOwner(page);
	});

	test("E2E1 owner opens /admin without AdminUser row", async ({ page }) => {
		await expect(page.getByRole("link", { name: "Products" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Admin Users" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Faculty Awards" })).toBeVisible();
	});

	test("E2E2 non-admin receives 403", async ({ page }) => {
		await page.evaluate(() => {
			const harness = window.__ADMIN_TEST__!;
			harness.setIdentity(harness.identities.TEST_NON_ADMIN);
		});
		await page.goto("/admin");
		await expect(page.getByText("Forbidden")).toBeVisible();
		await expect(page.getByText("You do not have administrator access.")).toBeVisible();
	});

	test("E2E3 owner appears and cannot be removed", async ({ page }) => {
		await page.getByRole("link", { name: "Admin Users" }).click();
		await expect(page.getByText("owner@example.edu")).toBeVisible();
		await expect(page.getByText("Owner")).toBeVisible();
		await page.getByText("owner@example.edu").click();
		await expect(page.getByText("Owner")).toBeVisible();
		await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
	});

	test("E2E4-E2E6 membership add/bind/remove", async ({ page }) => {
		await page.getByRole("link", { name: "Admin Users" }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-email").fill("admin@example.edu");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByDisplayValue("admin@example.edu")).toBeVisible();

		await page.evaluate(async () => {
			const harness = window.__ADMIN_TEST__!;
			harness.setIdentity(harness.identities.TEST_ADMIN);
			await harness.membership.bindOnLogin(harness.identities.TEST_ADMIN);
		});
		await page.goto("/admin/admin-users");
		await expect(page.getByText("admin@example.edu")).toBeVisible();

		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-email").fill("invitee@example.edu");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByDisplayValue("invitee@example.edu")).toBeVisible();

		await page.evaluate(async () => {
			const harness = window.__ADMIN_TEST__!;
			await harness.membership.bindOnLogin(harness.identities.TEST_INVITEE);
		});
		await page.goto("/admin/admin-users");
		await page.getByText("invitee@example.edu").click();
		await expect(page.getByDisplayValue("user-invitee")).toBeVisible();
		await page.getByRole("button", { name: "Remove" }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
		await expect(page.getByText("invitee@example.edu")).toHaveCount(0);
	});

	test("E2E7-E2E9 list, pagination, sort", async ({ page }) => {
		await page.getByRole("link", { name: "Products" }).click();
		await expect(page.getByRole("button", { name: "Next" })).toBeEnabled();
		const firstId = await page.locator("tbody tr").first().locator("td").first().textContent();
		await page.getByRole("button", { name: "Next" }).click();
		const secondId = await page.locator("tbody tr").first().locator("td").first().textContent();
		expect(secondId).not.toBe(firstId);
		await page.getByRole("button", { name: "Previous" }).click();
		await expect(page.locator("tbody tr").first().locator("td").first()).toHaveText(firstId ?? "");
		await page.getByRole("button", { name: "Name" }).click();
		await expect(page.getByText("↑").or(page.getByText("↓"))).toBeVisible();
	});

	test("E2E10-E2E13 create, edit, validation, delete", async ({ page }) => {
		await page.getByRole("link", { name: "Products" }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-name").fill("Kept Name");
		await page.locator("#field-priceInCents").fill("12.5");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByText("Must be an integer")).toBeVisible();
		await expect(page.locator("#field-name")).toHaveValue("Kept Name");

		await page.locator("#field-priceInCents").fill("1250");
		await page.locator("#field-description").fill("A description");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/products\/.+/);
		await expect(page.locator("#field-name")).toHaveValue("Kept Name");

		await page.locator("#field-name").fill("Renamed Product");
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.locator("#field-name")).toHaveValue("Renamed Product");

		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
		await expect(page).toHaveURL(/\/admin\/products$/);
	});

	test("E2E14 forbidden entity permission failure", async ({ page }) => {
		await page.evaluate(() => window.__ADMIN_TEST__!.setForbidden(["Product"]));
		await page.goto("/admin/products");
		await expect(page.getByText("Forbidden")).toBeVisible();
	});

	test("E2E15 not-found for unknown resource or missing record", async ({ page }) => {
		await page.goto("/admin/not-a-resource");
		await expect(page.getByText("Not found")).toBeVisible();
		await page.goto("/admin/products/missing-record-id");
		await expect(page.getByText("Not found")).toBeVisible();
	});

	test("E2E16-E2E17 alphabetical resources and unauthenticated sign-in", async ({ page }) => {
		const labels = await page.locator("ul a").allTextContents();
		const trimmed = labels.map((label) => label.trim());
		expect(trimmed).toEqual([...trimmed].sort((a, b) => a.localeCompare(b)));

		await page.evaluate(() => window.__ADMIN_TEST__!.setIdentity(null));
		await page.goto("/admin");
		await expect(page.getByText("Sign in required")).toBeVisible();
		await page.getByRole("button", { name: "Sign in" }).click();
		await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
	});
});
