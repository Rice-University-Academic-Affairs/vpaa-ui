import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/svelte";
import { afterEach } from "vitest";

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
Object.defineProperty(window, "innerHeight", { value: 768, configurable: true });

afterEach(() => {
	cleanup();
});
