import { expect, test, type Page } from "@playwright/test";

async function gotoShowcase(page: Page) {
	await page.goto("/", { waitUntil: "networkidle" });
	await page.waitForTimeout(300);
}

async function openChat(page: Page) {
	await page.getByRole("button", { name: "Open AI assistant" }).click();
	await expect(page.getByRole("heading", { name: "AI Assistant" })).toBeVisible();
}

test.describe("Showcase AI chat", () => {
	test("opens the chat panel and streams a demo assistant reply", async ({ page }) => {
		await gotoShowcase(page);
		await openChat(page);

		await expect(page.getByRole("heading", { name: "Faculty headcount trends" })).toBeVisible();

		const input = page.getByRole("textbox", { name: "Ask a question…" });
		await input.fill("Budget question");
		await page.getByRole("button", { name: "Send message" }).click();

		await expect(page.getByRole("status", { name: "Assistant is responding" })).toBeVisible();
		await expect(page.getByText(/Thanks for your question about "Budget question"/)).toBeVisible({
			timeout: 10000
		});
	});

	test("deletes a conversation from the thread list", async ({ page }) => {
		await gotoShowcase(page);
		await openChat(page);

		const thread = page.getByRole("button", {
			name: "Department budget summary Show me the top three departments by spend."
		});
		await expect(thread).toBeVisible();
		await thread.hover();
		await page.getByRole("button", { name: "Delete Department budget summary" }).click();

		await expect(thread).not.toBeVisible();
	});
});
