import { expect, type Locator, type Page } from "@playwright/test";

export async function gotoShowcase(page: Page) {
	await page.goto("/", { waitUntil: "networkidle" });
	await page.waitForTimeout(300);
}

export function facultyTable(page: Page): Locator {
	return page.getByRole("heading", { name: "All faculty" }).locator("xpath=ancestor::section[1]");
}

export function drilldownTable(page: Page): Locator {
	return page
		.getByRole("heading", { name: "Faculty drilldown" })
		.locator("xpath=ancestor::section[1]");
}

export function appShellContent(page: Page): Locator {
	return page.locator("[data-app-shell-content]");
}

export async function openChat(page: Page) {
	await page.getByRole("button", { name: "Open AI assistant" }).click();
	await expect(page.getByRole("heading", { name: "AI Assistant" })).toBeVisible();
}

export function chatPanel(page: Page): Locator {
	return page.getByRole("dialog");
}

export async function openHeaderSearch(page: Page) {
	await page.locator("header").getByRole("button", { name: "Search" }).click();
	const searchInput = page.locator("header").getByPlaceholder("Search faculty…");
	await expect(searchInput).toBeVisible();
	return searchInput;
}
