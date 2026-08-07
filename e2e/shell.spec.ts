import { expect, test } from "@playwright/test";
import { gotoShowcase, openHeaderSearch } from "./helpers/showcase.js";

test.describe("Showcase app shell", () => {
	test("finds and selects a faculty member from global search", async ({ page }) => {
		await gotoShowcase(page);
		const searchInput = await openHeaderSearch(page);

		await searchInput.fill("Elena");
		await page.locator("header").getByRole("button", { name: /Elena/ }).click();

		await expect(page.locator("[data-search-result]")).toHaveAttribute(
			"data-search-result",
			"Dr. Elena Martinez"
		);
		await expect(page.locator("header").getByPlaceholder("Search faculty…")).not.toBeVisible();
	});
});
