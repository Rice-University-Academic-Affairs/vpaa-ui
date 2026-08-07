import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stabilizeTableScroll } from "./stabilize-table-scroll.js";

describe("stabilizeTableScroll", () => {
	let container: HTMLDivElement;
	let root: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement("div");
		root = document.createElement("div");
		container.style.overflowY = "auto";
		container.scrollTop = 120;
		container.appendChild(root);
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
		vi.restoreAllMocks();
	});

	it("scrolls the nearest scroll container up when the table shrinks", () => {
		vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
			bottom: 140,
			top: 0,
			left: 0,
			right: 0,
			width: 0,
			height: 0,
			x: 0,
			y: 0,
			toJSON: () => ({})
		} as DOMRect);
		const focusSpy = vi.spyOn(root, "focus").mockImplementation(() => {});

		stabilizeTableScroll(root, 200);

		expect(container.scrollTop).toBe(60);
		expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
	});

	it("does not scroll when the table height is unchanged", () => {
		vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
			bottom: 199,
			top: 0,
			left: 0,
			right: 0,
			width: 0,
			height: 0,
			x: 0,
			y: 0,
			toJSON: () => ({})
		} as DOMRect);
		vi.spyOn(root, "focus").mockImplementation(() => {});

		stabilizeTableScroll(root, 200);

		expect(container.scrollTop).toBe(120);
	});
});
