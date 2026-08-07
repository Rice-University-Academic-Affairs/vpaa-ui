import { expect, test, type Page } from "@playwright/test";

async function waitForAdminHarness(page: Page) {
	await page.goto("/admin");
	await page.waitForFunction(() => Boolean(window.__ADMIN_TEST__));
}

async function resetAsOwner(page: Page) {
	await waitForAdminHarness(page);
	await page.evaluate(async () => {
		const harness = window.__ADMIN_TEST__!;
		harness.resetData();
		harness.setForbidden([]);
		await harness.setIdentity(harness.identities.TEST_OWNER);
	});
	await page.goto("/admin");
	await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
}

test.describe("Admin application E2E", () => {
	test.beforeEach(async ({ page }) => {
		await resetAsOwner(page);
	});

	test("E2E1 owner opens /admin without AdminUser row", async ({ page }) => {
		await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Products", exact: true })).toBeVisible();
		await expect(page.getByRole("link", { name: "Admin Users", exact: true })).toBeVisible();
		await expect(page.getByRole("link", { name: "Faculty Awards", exact: true })).toBeVisible();
	});

	test("E2E-NAV Admin tab only for admins", async ({ page }) => {
		await page.goto("/");
		await page.waitForFunction(() => Boolean(window.__ADMIN_TEST__));
		await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" })).toBeVisible();

		await page.evaluate(async () => {
			const harness = window.__ADMIN_TEST__!;
			await harness.setIdentity(harness.identities.TEST_NON_ADMIN);
		});
		await expect(
			page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" })
		).toHaveCount(0);
		await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Showcase" })).toBeVisible();
	});

	test("E2E-NAV Sign in invalidates Admin tab without leaving /admin", async ({ page }) => {
		await page.evaluate(async () => {
			await window.__ADMIN_TEST__!.setIdentity(null);
		});
		await page.goto("/admin");
		await expect(page.getByText("Sign in required")).toBeVisible();
		await expect(
			page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" })
		).toHaveCount(0);

		await page.getByRole("button", { name: "Sign in" }).click();
		await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
		await expect(
			page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" })
		).toBeVisible();
	});

	test("E2E2 non-admin receives 403 on root and deep links", async ({ page }) => {
		await page.evaluate(async () => {
			const harness = window.__ADMIN_TEST__!;
			await harness.setIdentity(harness.identities.TEST_NON_ADMIN);
		});
		await page.goto("/admin");
		await expect(page.getByRole("alert").filter({ hasText: "Forbidden" })).toBeVisible();
		await page.goto("/admin/products");
		await expect(page.getByRole("alert").filter({ hasText: "Forbidden" })).toBeVisible();
		await page.goto("/admin/products/new");
		await expect(page.getByRole("alert").filter({ hasText: "Forbidden" })).toBeVisible();
		await page.goto("/admin/admin-users");
		await expect(page.getByRole("alert").filter({ hasText: "Forbidden" })).toBeVisible();
		await page.goto("/admin/faculty-awards/new");
		await expect(page.getByRole("alert").filter({ hasText: "Forbidden" })).toBeVisible();
	});

	test("A6 Admin breadcrumb returns to resource index", async ({ page }) => {
		await page.getByRole("link", { name: "Products", exact: true }).click();
		await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
		await page.getByRole("main").getByRole("link", { name: "Admin", exact: true }).click();
		await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Products", exact: true })).toBeVisible();
	});

	test("E2E3 owner appears and cannot be removed", async ({ page }) => {
		await page.getByRole("link", { name: "Admin Users", exact: true }).click();
		await expect(page.getByRole("main").getByText("owner@example.edu")).toBeVisible();
		await expect(page.locator('[data-slot="badge"]', { hasText: "Owner" })).toBeVisible();
		await page.getByRole("main").getByRole("button", { name: /owner@example.edu/ }).click();
		await expect(page.locator('[data-slot="badge"]', { hasText: "Owner" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
		await expect(page.locator("#member-userId")).toHaveCount(0);
	});

	test("E2E4-E2E6 membership add/remove by email", async ({ page }) => {
		await page.getByRole("link", { name: "Admin Users", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-email").fill("admin@example.edu");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.locator("#member-email")).toHaveValue("admin@example.edu");
		await expect(page.locator("#member-userId")).toHaveCount(0);

		await page.evaluate(async () => {
			const harness = window.__ADMIN_TEST__!;
			await harness.setIdentity(harness.identities.TEST_ADMIN);
		});
		await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" })).toBeVisible();
		await page.goto("/admin/admin-users");
		await expect(page.getByRole("main").getByText("admin@example.edu")).toBeVisible();

		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-email").fill("invitee@example.edu");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.locator("#member-email")).toHaveValue("invitee@example.edu");

		await page.goto("/admin/admin-users");
		await page.getByRole("main").getByRole("button", { name: /invitee@example.edu/ }).click();
		await page.getByRole("button", { name: "Remove" }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
		await expect(page.getByRole("main").getByText("invitee@example.edu")).toHaveCount(0);
	});

	test("E2E7-E2E9 list, pagination, sort", async ({ page }) => {
		await page.getByRole("link", { name: "Products", exact: true }).click();
		await expect(page.locator("tbody tr")).toHaveCount(25);
		await expect(page.getByRole("button", { name: "Next" })).toBeEnabled();
		const firstId = await page.locator("tbody tr").first().locator("td").first().textContent();
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.locator("tbody tr")).toHaveCount(5);
		const secondId = await page.locator("tbody tr").first().locator("td").first().textContent();
		expect(secondId).not.toBe(firstId);
		await page.getByRole("button", { name: "Previous" }).click();
		await expect(page.locator("tbody tr")).toHaveCount(25);
		await expect(page.locator("tbody tr").first().locator("td").first()).toHaveText(firstId ?? "");
		await page.getByRole("button", { name: "Name" }).click();
		await page.getByRole("button", { name: "Name" }).click();
		await expect(page.getByRole("button", { name: /Name/ })).toContainText("↓");
		await expect(page.locator("tbody tr")).toHaveCount(25);
		const namesDesc = await page.locator("tbody tr td:nth-child(2)").allTextContents();
		expect(namesDesc[0]?.trim()).toBe("Product 030");
		expect(namesDesc[namesDesc.length - 1]?.trim()).toBe("Product 006");
	});

	test("P-E2E double Next does not skip a page", async ({ page }) => {
		await page.getByRole("link", { name: "Products", exact: true }).click();
		await expect(page.locator("tbody tr")).toHaveCount(25);
		const page1First = await page.locator("tbody tr").first().locator("td").first().textContent();
		await page.getByRole("button", { name: "Next" }).dblclick();
		await expect(page.locator("tbody tr")).toHaveCount(5);
		const page2First = await page.locator("tbody tr").first().locator("td").first().textContent();
		expect(page2First).not.toBe(page1First);
		await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
		await page.getByRole("button", { name: "Previous" }).click();
		await expect(page.locator("tbody tr")).toHaveCount(25);
		await expect(page.locator("tbody tr").first().locator("td").first()).toHaveText(page1First ?? "");
	});

	test("E2E10-E2E13 create, edit, validation, delete", async ({ page }) => {
		await page.getByRole("link", { name: "Products", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-name").fill("Kept Name");
		await page.locator("#field-priceInCents").fill("12.5");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByText("Must be an integer")).toBeVisible();
		await expect(page.locator("#field-name")).toHaveValue("Kept Name");

		await page.locator("#field-priceInCents").fill("1250");
		await page.locator("#field-description").fill("A description");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/products\/(?!new$)[^/]+$/);
		const editUrl = page.url();
		expect(editUrl).not.toContain("/new");
		await expect(page.locator("#field-name")).toHaveValue("Kept Name");

		await page.locator("#field-name").fill("Renamed Product");
		await page.getByRole("button", { name: "Save" }).click();
		await page.reload();
		await expect(page.locator("#field-name")).toHaveValue("Renamed Product");

		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(page).toHaveURL(editUrl);
		await expect(page.locator("#field-name")).toHaveValue("Renamed Product");
		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
		await expect(page).toHaveURL(/\/admin\/products$/);
		await page.goto(editUrl);
		await expect(page.getByRole("alert").filter({ hasText: "Not found" })).toBeVisible();
	});

	test("E2E FacultyAward enum/boolean/textarea create and reload", async ({ page }) => {
		await page.getByRole("link", { name: "Faculty Awards", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-title").fill("Teaching Excellence");
		await page.locator("#field-facultyId").fill("FAC-100");
		await page.locator("#field-status").click();
		await page.getByRole("option", { name: "nominated" }).click();
		await page.getByRole("checkbox", { name: "Published" }).click();
		await page.locator("#field-notes").fill("Strong dossier");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/faculty-awards\/(?!new$)[^/]+$/);
		await expect(page.locator("#field-title")).toHaveValue("Teaching Excellence");
		await expect(page.locator("#field-facultyId")).toHaveValue("FAC-100");
		await expect(page.locator("#field-notes")).toHaveValue("Strong dossier");
		await expect(page.getByRole("checkbox", { name: "Published" })).toBeChecked();
		await page.reload();
		await expect(page.locator("#field-title")).toHaveValue("Teaching Excellence");
		await expect(page.locator("#field-status")).toContainText("nominated");
		await expect(page.getByRole("checkbox", { name: "Published" })).toBeChecked();
	});

	test("E2E14 forbidden entity permission failure", async ({ page }) => {
		await page.evaluate(() => window.__ADMIN_TEST__!.setForbidden(["Product"]));
		await page.goto("/admin/products");
		await expect(page.getByRole("alert").filter({ hasText: "Forbidden" })).toBeVisible();
		await page.reload();
		await expect(page.getByRole("alert").filter({ hasText: "Forbidden" })).toBeVisible();
	});

	test("E2E15 not-found for unknown resource or missing record", async ({ page }) => {
		await page.goto("/admin/not-a-resource");
		await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
		await page.goto("/admin/products/missing-record-id");
		await expect(page.getByRole("alert").filter({ hasText: "Not found" })).toBeVisible();
	});

	test("E2E16-E2E17 alphabetical resources and unauthenticated sign-in", async ({ page }) => {
		const labels = await page.locator(".max-w-7xl ul a").allTextContents();
		const trimmed = labels.map((label) => label.trim());
		expect(trimmed).toEqual([
			"Admin Users",
			"Faculties",
			"Faculty Awards",
			"Products",
			"Research Grants",
			"Sabbatical Credits"
		]);

		await page.evaluate(async () => window.__ADMIN_TEST__!.setIdentity(null));
		await expect(
			page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" })
		).toHaveCount(0);
		await page.goto("/admin");
		await expect(page.getByText("Sign in required")).toBeVisible();
		await page.getByRole("button", { name: "Sign in" }).click();
		await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
		await expect(
			page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" })
		).toBeVisible();
	});

	test("B6-B7 Admin Users cancel remove and self-remove hidden", async ({ page }) => {
		await page.getByRole("link", { name: "Admin Users", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-email").fill("admin@example.edu");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.locator("#member-email")).toHaveValue("admin@example.edu");

		await page.goto("/admin/admin-users");
		await page.getByRole("main").getByRole("button", { name: /admin@example.edu/ }).click();
		await page.getByRole("button", { name: "Remove" }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(page.locator("#member-email")).toHaveValue("admin@example.edu");

		await page.evaluate(async () => {
			const harness = window.__ADMIN_TEST__!;
			await harness.setIdentity(harness.identities.TEST_ADMIN);
		});
		await page.goto("/admin/admin-users");
		await page.getByRole("main").getByRole("button", { name: /admin@example.edu/ }).click();
		await expect(page.locator("#member-email")).toHaveValue("admin@example.edu");
		await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
	});

	test("B8-B11 Admin Users validation conflict and missing id", async ({ page }) => {
		await page.getByRole("link", { name: "Admin Users", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-email").fill("nope");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByText("Invalid email")).toBeVisible();
		await expect(page.locator("#field-email")).toHaveValue("nope");

		await page.locator("#field-email").fill("owner@example.edu");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByRole("alert").filter({ hasText: "Conflict" })).toBeVisible();

		await page.locator("#field-email").fill("admin@example.edu");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.locator("#member-email")).toHaveValue("admin@example.edu");

		await page.goto("/admin/admin-users/new");
		await page.locator("#field-email").fill("admin@example.edu");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByRole("alert").filter({ hasText: "Conflict" })).toBeVisible();

		await page.goto("/admin/admin-users/missing-member-id");
		await expect(page.getByRole("alert").filter({ hasText: "Not found" })).toBeVisible();
	});

	test("C3-C4-C6-C7 Products sort asc row-click required empty list", async ({ page }) => {
		await page.getByRole("link", { name: "Products", exact: true }).click();
		await page.getByRole("button", { name: "Name" }).click();
		await expect(page.getByRole("button", { name: /Name/ })).toContainText("↑");
		const namesAsc = await page.locator("tbody tr td:nth-child(2)").allTextContents();
		expect(namesAsc[0]?.trim()).toBe("Product 001");
		expect(namesAsc[namesAsc.length - 1]?.trim()).toBe("Product 025");

		const firstId = (await page.locator("tbody tr").first().locator("td").first().textContent())?.trim();
		await page.locator("tbody tr").first().click();
		await expect(page).toHaveURL(new RegExp(`/admin/products/${firstId}$`));
		await expect(page.locator("#field-name")).toHaveValue("Product 001");

		await page.goto("/admin/products/new");
		await page.locator("#field-priceInCents").fill("100");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByText("Required")).toBeVisible();
		await expect(page.locator("#field-priceInCents")).toHaveValue("100");

		await page.evaluate(() => {
			window.__ADMIN_TEST__!.data.reset({ Product: [] });
		});
		await page.goto("/admin/products");
		await expect(page.getByText("No records")).toBeVisible();
	});

	test("C9 Products forbidden on create when entity denied", async ({ page }) => {
		await page.evaluate(() => window.__ADMIN_TEST__!.setForbidden(["Product"]));
		await page.goto("/admin/products/new");
		await page.locator("#field-name").fill("Blocked");
		await page.locator("#field-priceInCents").fill("100");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByRole("alert").filter({ hasText: "Forbidden" })).toBeVisible();
	});

	test("D2-D4 Faculty Awards list edit delete", async ({ page }) => {
		await page.getByRole("link", { name: "Faculty Awards", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-title").fill("Research Merit");
		await page.locator("#field-facultyId").fill("FAC-200");
		await page.locator("#field-status").click();
		await page.getByRole("option", { name: "awarded" }).click();
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/faculty-awards\/(?!new$)[^/]+$/);
		const editUrl = page.url();

		await page.goto("/admin/faculty-awards");
		await expect(page.getByRole("main").getByText("Research Merit")).toBeVisible();
		await page.getByRole("main").getByText("Research Merit").click();
		await expect(page).toHaveURL(editUrl);

		await page.locator("#field-title").fill("Research Merit Updated");
		await page.getByRole("button", { name: "Save" }).click();
		await page.reload();
		await expect(page.locator("#field-title")).toHaveValue("Research Merit Updated");

		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(page.locator("#field-title")).toHaveValue("Research Merit Updated");

		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
		await expect(page).toHaveURL(/\/admin\/faculty-awards$/);
		await expect(page.getByRole("main").getByText("Research Merit Updated")).toHaveCount(0);
	});

	test("E3 unknown resource new route shows Not found", async ({ page }) => {
		await page.goto("/admin/not-a-resource/new");
		await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
		await expect(page.getByRole("alert").filter({ hasText: "Unknown resource" })).toBeVisible();
	});

	test("CD-E2E delete parent with no children", async ({ page }) => {
		await page.getByRole("link", { name: "Faculties", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-name").fill("Solo Faculty");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/faculties\/(?!new$)[^/]+$/);
		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await expect(page.getByRole("dialog")).toContainText("permanently deleted");
		await expect(page.getByRole("dialog")).not.toContainText("Sabbatical");
		await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
		await expect(page).toHaveURL(/\/admin\/faculties$/);
		await expect(page.getByRole("main").getByText("Solo Faculty")).toHaveCount(0);
	});

	test("CD-E2E delete parent cascades exclusive sabbatical credits", async ({ page }) => {
		await page.getByRole("link", { name: "Faculties", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-name").fill("Cascade Parent");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/faculties\/(?!new$)[^/]+$/);
		const facultyUrl = page.url();
		const facultyId = facultyUrl.split("/").pop()!;

		await page.goto("/admin/sabbatical-credits/new");
		await page.locator("#field-facultyId").fill(facultyId);
		await page.locator("#field-year").fill("2024");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/sabbatical-credits\/(?!new$)[^/]+$/);
		const creditId = page.url().split("/").pop()!;

		await page.goto("/admin/sabbatical-credits/new");
		await page.locator("#field-facultyId").fill(facultyId);
		await page.locator("#field-year").fill("2025");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/sabbatical-credits\/(?!new$)[^/]+$/);

		await page.goto(facultyUrl);
		await expect(page.locator("#field-name")).toHaveValue("Cascade Parent");
		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await expect(page.getByRole("dialog")).toContainText("Delete record and related data");
		await expect(page.getByRole("dialog")).toContainText("2 Sabbatical Credits");
		await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
		await expect(page).toHaveURL(/\/admin\/faculties$/);
		await page.goto(`/admin/sabbatical-credits/${creditId}`);
		await expect(page.getByRole("alert").filter({ hasText: "Not found" })).toBeVisible();
		await page.goto("/admin/sabbatical-credits");
		await expect(page.getByText("No records")).toBeVisible();
	});

	test("CD-E2E shared child blocks parent delete", async ({ page }) => {
		await page.getByRole("link", { name: "Faculties", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-name").fill("Owner Faculty");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/faculties\/(?!new$)[^/]+$/);
		const ownerUrl = page.url();
		const ownerId = ownerUrl.split("/").pop()!;

		await page.goto("/admin/faculties/new");
		await page.locator("#field-name").fill("Mentor Faculty");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/faculties\/(?!new$)[^/]+$/);
		const mentorId = page.url().split("/").pop()!;

		await page.goto("/admin/sabbatical-credits/new");
		await page.locator("#field-facultyId").fill(ownerId);
		await page.locator("#field-sharedWithFacultyId").fill(mentorId);
		await page.locator("#field-year").fill("2026");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/sabbatical-credits\/(?!new$)[^/]+$/);

		await page.goto(ownerUrl);
		await expect(page.locator("#field-name")).toHaveValue("Owner Faculty");
		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await expect(page.getByRole("dialog")).toContainText("Cannot delete");
		await expect(page.getByRole("dialog")).toContainText("shared with another parent");
		await expect(page.getByRole("dialog").getByRole("button", { name: "Delete" })).toHaveCount(0);
		await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
		await expect(page).toHaveURL(ownerUrl);
		await expect(page.locator("#field-name")).toHaveValue("Owner Faculty");
	});

	test("CD-E2E restrict ResearchGrant blocks parent delete", async ({ page }) => {
		await page.getByRole("link", { name: "Faculties", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-name").fill("Grant Holder");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/faculties\/(?!new$)[^/]+$/);
		const facultyUrl = page.url();
		const facultyId = facultyUrl.split("/").pop()!;

		await page.goto("/admin/research-grants/new");
		await page.locator("#field-title").fill("NIH Career");
		await page.locator("#field-facultyId").fill(facultyId);
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/research-grants\/(?!new$)[^/]+$/);

		await page.goto(facultyUrl);
		await expect(page.locator("#field-name")).toHaveValue("Grant Holder");
		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await expect(page.getByRole("dialog")).toContainText("Cannot delete");
		await expect(page.getByRole("dialog")).toContainText("Research Grants");
		await expect(page.getByRole("dialog").getByRole("button", { name: "Delete" })).toHaveCount(0);
		await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
		await expect(page.locator("#field-name")).toHaveValue("Grant Holder");
	});

	test("CD-E2E cancel cascade warning keeps parent and children", async ({ page }) => {
		await page.getByRole("link", { name: "Faculties", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-name").fill("Keep Parent");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/faculties\/(?!new$)[^/]+$/);
		const facultyUrl = page.url();
		const facultyId = facultyUrl.split("/").pop()!;

		await page.goto("/admin/sabbatical-credits/new");
		await page.locator("#field-facultyId").fill(facultyId);
		await page.locator("#field-year").fill("2023");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/sabbatical-credits\/(?!new$)[^/]+$/);
		const creditUrl = page.url();

		await page.goto(facultyUrl);
		await expect(page.locator("#field-name")).toHaveValue("Keep Parent");
		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await expect(page.getByRole("dialog")).toContainText("1 Sabbatical Credits");
		await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(page.locator("#field-name")).toHaveValue("Keep Parent");
		await page.goto(creditUrl);
		await expect(page.locator("#field-year")).toHaveValue("2023");
	});

	test("CD-E2E mentor-only faculty cannot delete while credits reference them", async ({ page }) => {
		await page.getByRole("link", { name: "Faculties", exact: true }).click();
		await page.getByRole("link", { name: "New" }).click();
		await page.locator("#field-name").fill("Credit Owner");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/faculties\/(?!new$)[^/]+$/);
		const ownerId = page.url().split("/").pop()!;

		await page.goto("/admin/faculties/new");
		await page.locator("#field-name").fill("Credit Mentor");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/faculties\/(?!new$)[^/]+$/);
		const mentorUrl = page.url();
		const mentorId = mentorUrl.split("/").pop()!;

		await page.goto("/admin/sabbatical-credits/new");
		await page.locator("#field-facultyId").fill(ownerId);
		await page.locator("#field-sharedWithFacultyId").fill(mentorId);
		await page.locator("#field-year").fill("2027");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page).toHaveURL(/\/admin\/sabbatical-credits\/(?!new$)[^/]+$/);

		await page.goto(mentorUrl);
		await expect(page.locator("#field-name")).toHaveValue("Credit Mentor");
		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await expect(page.getByRole("dialog")).toContainText("Cannot delete");
		await expect(page.getByRole("dialog")).toContainText("Sabbatical Credits");
		await expect(page.getByRole("dialog").getByRole("button", { name: "Delete" })).toHaveCount(0);
		await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
		await expect(page.locator("#field-name")).toHaveValue("Credit Mentor");
	});
});
