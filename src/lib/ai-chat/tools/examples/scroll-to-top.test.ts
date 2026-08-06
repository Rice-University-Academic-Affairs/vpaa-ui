import { describe, expect, it } from "vitest";
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
});
