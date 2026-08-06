import { describe, expect, it } from "vitest";
import { scrollAppShellContent } from "$lib/components/app-shell/scroll-app-shell.js";
import { clientTools } from "../index.js";
import {
	createScrollToTopClientTool,
	scrollToTopDef
} from "./scroll-to-top.js";

describe("client tools example", () => {
	it("defines an isomorphic tool the server can advertise", () => {
		expect(scrollToTopDef.name).toBe("scroll_to_top");
		expect(scrollToTopDef.__toolSide).toBe("definition");
	});

	it("creates a browser-executed client implementation", async () => {
		let scrolledTo = -1;
		const tool = createScrollToTopClientTool((top) => {
			scrolledTo = top;
		});

		expect(tool.__toolSide).toBe("client");
		expect(tool.name).toBe("scroll_to_top");
		expect(await tool.execute?.({}, {} as never)).toEqual({ scrolled: true });
		expect(scrolledTo).toBe(0);
	});

	it("wraps client tools for createAiChatSession clientTools option", () => {
		const tool = createScrollToTopClientTool();
		const tools = clientTools(tool);

		expect(tools).toHaveLength(1);
		expect(tools[0]?.name).toBe("scroll_to_top");
	});

	it("scrolls the AppShell content region by default", async () => {
		const main = document.createElement("main");
		main.setAttribute("data-app-shell-content", "");
		document.body.append(main);

		const scrolled: Array<{ element: HTMLElement; top: number }> = [];
		const tool = createScrollToTopClientTool((top) => {
			scrollAppShellContent(top, (element, value) => {
				scrolled.push({ element, top: value });
			});
		});

		expect(await tool.execute?.({}, {} as never)).toEqual({ scrolled: true });
		expect(scrolled).toEqual([{ element: main, top: 0 }]);
		main.remove();
	});
});
