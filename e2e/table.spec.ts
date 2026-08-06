import { expect, test, type Page } from "@playwright/test";

async function gotoShowcase(page: Page) {
	await page.goto("/", { waitUntil: "networkidle" });
	await page.waitForTimeout(300);
}

function facultyTable(page: Page) {
	return page.getByRole("heading", { name: "All faculty" }).locator("xpath=ancestor::section[1]");
}

function drilldownTable(page: Page) {
	return page.getByRole("heading", { name: "Faculty drilldown" }).locator("xpath=ancestor::section[1]");
}

test.describe("Showcase data table", () => {
	test("paginates faculty rows with Next and Previous", async ({ page }) => {
		await gotoShowcase(page);

		const table = facultyTable(page);
		await expect(table.getByText("Page 1 of 2")).toBeVisible();
		await expect(table.locator("tbody tr")).toHaveCount(10);
		await expect(table.locator("tbody tr").first()).toContainText("Dr. Elena Martinez");

		await table.getByRole("button", { name: "Next" }).click();

		await expect(table.getByText("Page 2 of 2")).toBeVisible();
		await expect(table.locator("tbody tr")).toHaveCount(2);
		await expect(table.locator("tbody tr").first()).toContainText("Dr. Emily Foster");
		await expect(table.locator("tbody tr").last()).toContainText("Dr. Raj Patel");

		await table.getByRole("button", { name: "Previous" }).click();

		await expect(table.getByText("Page 1 of 2")).toBeVisible();
		await expect(table.locator("tbody tr")).toHaveCount(10);
		await expect(table.locator("tbody tr").first()).toContainText("Dr. Elena Martinez");
	});

	test("searches faculty and resets pagination", async ({ page }) => {
		await gotoShowcase(page);

		const table = facultyTable(page);
		await table.getByRole("button", { name: "Next" }).click();
		await expect(table.getByText("Page 2 of 2")).toBeVisible();

		await table.getByLabel("Search faculty…").fill("Elena");

		await expect(table.getByText("Page 1 of 1")).toBeVisible();
		await expect(table.locator("tbody tr")).toHaveCount(1);
		await expect(table.locator("tbody tr").first()).toContainText("Dr. Elena Martinez");
	});

	test("sorts faculty by descending name", async ({ page }) => {
		await gotoShowcase(page);

		const table = facultyTable(page);
		await table.getByRole("button", { name: "Name" }).click();
		await page.getByRole("menuitemradio", { name: "Descending" }).click();

		await expect(table.locator("tbody tr").first()).toContainText("Dr. Sarah Williams");
	});
});

test.describe("Showcase drilldown table", () => {
	test("drills from schools into departments and faculty", async ({ page }) => {
		await gotoShowcase(page);

		const drilldown = drilldownTable(page);

		await expect(drilldown.locator("tbody tr")).toHaveCount(3);
		await drilldown.locator("tbody tr").first().click();
		await expect(drilldown.getByRole("navigation", { name: "Drilldown navigation" })).toContainText(
			"All schools"
		);
		await expect(drilldown.locator("tbody tr")).not.toHaveCount(3);
	});
});
