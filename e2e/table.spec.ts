import { expect, test } from "@playwright/test";
import { drilldownTable, facultyTable, gotoShowcase } from "./helpers/showcase.js";

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

	test("filters faculty by status from the filter popover", async ({ page }) => {
		await gotoShowcase(page);

		const table = facultyTable(page);
		await table.getByRole("button", { name: "Filter" }).click();
		await page.getByLabel("Tenured").click();

		await expect(table.locator("tbody tr")).toHaveCount(6);
		await expect(table.getByText("Showing 6")).toBeVisible();
		await expect(table.locator("tbody tr").first()).toContainText("Dr. Elena Martinez");
	});

	test("removes a filter chip and restores all rows", async ({ page }) => {
		await gotoShowcase(page);

		const table = facultyTable(page);
		await table.getByRole("button", { name: "Filter" }).click();
		await page.getByLabel("Tenured").click();

		await expect(table.locator("tbody tr")).toHaveCount(6);
		await table.getByRole("button", { name: "Remove Status Tenured" }).click();

		await expect(table.locator("tbody tr")).toHaveCount(10);
		await expect(table.getByText("Page 1 of 2")).toBeVisible();
	});

	test("clears all filters from the active filters bar", async ({ page }) => {
		await gotoShowcase(page);

		const table = facultyTable(page);
		await table.getByRole("button", { name: "Filter" }).click();
		await page.getByLabel("Tenured").click();

		await expect(table.locator("tbody tr")).toHaveCount(6);
		await table.getByRole("button", { name: "Clear all" }).click();

		await expect(table.locator("tbody tr")).toHaveCount(10);
		await expect(table.getByText("Page 1 of 2")).toBeVisible();
	});
});

test.describe("Showcase drilldown table", () => {
	test("drills from schools into departments and faculty", async ({ page }) => {
		await gotoShowcase(page);

		const drilldown = drilldownTable(page);

		await expect(drilldown.locator("tbody tr")).toHaveCount(3);
		await drilldown.locator("tbody tr").first().click();
		await expect(drilldown.getByRole("navigation", { name: "Drilldown navigation" })).toContainText(
			"School of Engineering"
		);
		await expect(drilldown.locator("tbody tr")).toHaveCount(6);

		await drilldown.locator("tbody tr").first().click();
		await expect(drilldown.getByRole("navigation", { name: "Drilldown navigation" })).toContainText(
			"Architecture"
		);
		await expect(drilldown.getByRole("columnheader", { name: "Status" })).toBeVisible();
		await expect(drilldown.locator("tbody tr")).toHaveCount(1);
		await expect(drilldown.locator("tbody tr").first()).toContainText("Dr. Raj Patel");
	});

	test("navigates back via breadcrumb and back button", async ({ page }) => {
		await gotoShowcase(page);

		const drilldown = drilldownTable(page);
		await drilldown.locator("tbody tr").first().click();
		await expect(drilldown.locator("tbody tr")).toHaveCount(6);

		await drilldown.getByRole("button", { name: "All schools" }).click();
		await expect(drilldown.locator("tbody tr")).toHaveCount(3);

		await drilldown.locator("tbody tr").first().click();
		await drilldown.getByRole("button", { name: "Back" }).click();
		await expect(drilldown.locator("tbody tr")).toHaveCount(3);
	});

	test("switches drilldown to all faculty view", async ({ page }) => {
		await gotoShowcase(page);

		const drilldown = drilldownTable(page);
		await drilldown.getByRole("tab", { name: "All faculty" }).click();

		await expect(drilldown.getByRole("tab", { name: "All faculty" })).toHaveAttribute(
			"aria-selected",
			"true"
		);
		await expect(drilldown.getByText("12 faculty")).toBeVisible();
		await expect(drilldown.getByRole("textbox")).toBeVisible();
	});

	test("searches faculty after switching to the all faculty view", async ({ page }) => {
		await gotoShowcase(page);

		const drilldown = drilldownTable(page);
		await drilldown.getByRole("tab", { name: "All faculty" }).click();
		await drilldown.getByLabel("Search faculty…").fill("Elena");

		await expect(drilldown.locator("tbody tr")).toHaveCount(1);
		await expect(drilldown.locator("tbody tr").first()).toContainText("Dr. Elena Martinez");
	});

	test("filters all faculty by status in the drilldown table", async ({ page }) => {
		await gotoShowcase(page);

		const drilldown = drilldownTable(page);
		await drilldown.getByRole("tab", { name: "All faculty" }).click();
		await drilldown.getByRole("button", { name: "Filter" }).click();
		await page.getByLabel("Tenured").click();

		await expect(drilldown.locator("tbody tr")).toHaveCount(6);
		await expect(drilldown.getByText("Showing 6")).toBeVisible();
	});
});
