import { toolDefinition } from "@tanstack/ai";
import { clientTools } from "./tools.js";

export const scrollToTopDef = toolDefinition({
	name: "scroll_to_top",
	description: "Scroll the main page to the top",
	inputSchema: {
		type: "object",
		properties: {},
		additionalProperties: false
	},
	outputSchema: {
		type: "object",
		properties: {
			scrolled: { type: "boolean" }
		},
		required: ["scrolled"],
		additionalProperties: false
	}
});

export function createScrollToTopClientTool(scroll: (top: number) => void = (top) => {
	if (typeof window !== "undefined") {
		window.scrollTo({ top, behavior: "smooth" });
	}
}) {
	return scrollToTopDef.client(() => {
		scroll(0);
		return { scrolled: true };
	});
}

export const scrollToTopClientTools = clientTools(createScrollToTopClientTool());
