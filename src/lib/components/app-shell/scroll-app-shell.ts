export const APP_SHELL_CONTENT_SELECTOR = "[data-app-shell-content]";

export function scrollAppShellContent(
	top: number,
	scrollElement: (element: HTMLElement, top: number) => void = (element, value) => {
		element.scrollTo({ top: value, behavior: "smooth" });
	},
	fallback: (value: number) => void = (value) => {
		if (typeof window !== "undefined") {
			window.scrollTo({ top: value, behavior: "smooth" });
		}
	}
): boolean {
	if (typeof document === "undefined") return false;

	const element = document.querySelector(APP_SHELL_CONTENT_SELECTOR);
	if (element instanceof HTMLElement) {
		scrollElement(element, top);
		return true;
	}

	fallback(top);
	return false;
}
