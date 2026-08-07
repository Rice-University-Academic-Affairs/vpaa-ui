import { describe, expect, it } from "vitest";
import { scrollMessagesToBottom } from "./scroll-messages-to-bottom.js";

describe("scrollMessagesToBottom", () => {
	it("scrolls the viewport to the bottom", () => {
		const viewport = document.createElement("div");
		Object.defineProperty(viewport, "scrollHeight", { value: 480, configurable: true });
		viewport.scrollTop = 0;

		expect(scrollMessagesToBottom(viewport)).toBe(true);
		expect(viewport.scrollTop).toBe(480);
	});

	it("returns false when the viewport is missing", () => {
		expect(scrollMessagesToBottom(null)).toBe(false);
	});
});
