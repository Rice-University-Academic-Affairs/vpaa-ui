import { mergeAgentTools } from "@tanstack/ai";
import { describe, expect, it } from "vitest";
import { scrollToTopDef } from "$lib/ai-chat/tools/examples/scroll-to-top.js";
import { serverTools } from "./tools.js";

describe("mergeAgentTools", () => {
	it("keeps server tools when no client tools are declared", () => {
		const merged = mergeAgentTools(serverTools, []);

		expect(merged).toBe(serverTools);
		expect(merged.map((tool) => tool.name)).toEqual(["get_demo_stats"]);
	});

	it("adds client-only tools from the AG-UI request", () => {
		const merged = mergeAgentTools(serverTools, [
			{
				name: scrollToTopDef.name,
				description: scrollToTopDef.description,
				parameters: scrollToTopDef.inputSchema
			}
		]);

		expect(merged.map((tool) => tool.name)).toEqual(["get_demo_stats", "scroll_to_top"]);
	});

	it("prefers server tools when names collide", () => {
		const merged = mergeAgentTools(serverTools, [
			{
				name: "get_demo_stats",
				description: "Client override",
				parameters: { type: "object" }
			}
		]);

		expect(merged.map((tool) => tool.name)).toEqual(["get_demo_stats"]);
	});
});
