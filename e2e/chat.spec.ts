import { expect, test } from "@playwright/test";
import {
	appShellContent,
	chatPanel,
	gotoShowcase,
	openChat
} from "./helpers/showcase.js";

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

	test("switches between existing threads", async ({ page }) => {
		await gotoShowcase(page);
		await openChat(page);

		await expect(page.getByRole("heading", { name: "Faculty headcount trends" })).toBeVisible();

		await page
			.getByRole("button", {
				name: "Department budget summary Show me the top three departments by spend."
			})
			.click();

		await expect(page.getByRole("heading", { name: "Department budget summary" })).toBeVisible();
	});

	test("creates a new conversation", async ({ page }) => {
		await gotoShowcase(page);
		await openChat(page);

		await page.getByRole("button", { name: "New conversation" }).click();

		await expect(page.getByRole("heading", { name: "New chat" })).toBeVisible();
		await expect(page.getByText("How can I help?")).toBeVisible();

		const input = page.getByRole("textbox", { name: "Ask a question…" });
		await input.fill("Onboarding question");
		await page.getByRole("button", { name: "Send message" }).click();

		await expect(page.getByText(/Thanks for your question about "Onboarding question"/)).toBeVisible({
			timeout: 10000
		});
	});

	test("streams a demo stats reply when asked about headcount", async ({ page }) => {
		await gotoShowcase(page);
		await openChat(page);

		const input = page.getByRole("textbox", { name: "Ask a question…" });
		await input.fill("Faculty headcount stats");
		await page.getByRole("button", { name: "Send message" }).click();

		await expect(
			chatPanel(page)
				.locator("p.whitespace-pre-wrap")
				.filter({ hasText: /1247 faculty across 42 departments/ })
		).toBeVisible({
			timeout: 10000
		});
	});

	test("scrolls the main content when the assistant requests scroll_to_top", async ({ page }) => {
		await gotoShowcase(page);

		const main = appShellContent(page);
		await main.evaluate((element) => {
			element.scrollTop = 480;
		});
		await expect
			.poll(async () => main.evaluate((element) => element.scrollTop))
			.toBeGreaterThan(100);

		await openChat(page);

		const input = page.getByRole("textbox", { name: "Ask a question…" });
		await input.fill("Please scroll to top");
		await page.getByRole("button", { name: "Send message" }).click();

		const panel = chatPanel(page);
		await expect(
			panel.locator("p.whitespace-pre-wrap").filter({ hasText: "Client tool completed" })
		).toBeVisible({ timeout: 10000 });
		await expect
			.poll(async () => main.evaluate((element) => element.scrollTop), { timeout: 10000 })
			.toBeLessThan(20);
	});

	test("preserves thread state when closing and reopening the chat panel", async ({ page }) => {
		await gotoShowcase(page);
		await openChat(page);

		const input = page.getByRole("textbox", { name: "Ask a question…" });
		await input.fill("Persistence check");
		await page.getByRole("button", { name: "Send message" }).click();
		await expect(page.getByText(/Thanks for your question about "Persistence check"/)).toBeVisible({
			timeout: 10000
		});

		await chatPanel(page).getByRole("button", { name: "Close" }).click();
		await expect(page.getByRole("heading", { name: "AI Assistant" })).not.toBeVisible();

		await openChat(page);

		const panel = chatPanel(page);
		await expect(panel.getByText("Persistence check", { exact: true })).toBeVisible();
		await expect(
			panel
				.locator("p.whitespace-pre-wrap")
				.filter({ hasText: /^Thanks for your question about "Persistence check"/ })
		).toBeVisible();
	});
});
