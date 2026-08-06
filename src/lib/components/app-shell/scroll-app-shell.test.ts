import { afterEach, describe, expect, it } from "vitest";
import {
	APP_SHELL_CONTENT_SELECTOR,
	scrollAppShellContent
} from "./scroll-app-shell.js";

describe("scrollAppShellContent", () => {
	afterEach(() => {
		document.querySelector(APP_SHELL_CONTENT_SELECTOR)?.remove();
	});

	it("scrolls the AppShell main content region when it exists", () => {
		const main = document.createElement("main");
		main.setAttribute("data-app-shell-content", "");
		document.body.append(main);

		const scrolled: Array<{ element: HTMLElement; top: number }> = [];
		const usedFallback: number[] = [];

		const scrolledMain = scrollAppShellContent(
			0,
			(element, top) => {
				scrolled.push({ element, top });
			},
			(top) => {
				usedFallback.push(top);
			}
		);

		expect(scrolledMain).toBe(true);
		expect(scrolled).toEqual([{ element: main, top: 0 }]);
		expect(usedFallback).toEqual([]);
	});

	it("falls back to window scrolling when AppShell content is missing", () => {
		const usedFallback: number[] = [];

		const scrolledMain = scrollAppShellContent(
			120,
			() => {
				throw new Error("AppShell content should not be scrolled");
			},
			(top) => {
				usedFallback.push(top);
			}
		);

		expect(scrolledMain).toBe(false);
		expect(usedFallback).toEqual([120]);
	});
});
