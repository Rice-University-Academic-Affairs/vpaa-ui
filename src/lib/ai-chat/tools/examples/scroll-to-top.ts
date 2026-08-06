import { toolDefinition } from "@tanstack/ai";
import { scrollAppShellContent } from "$lib/components/app-shell/scroll-app-shell.js";

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

export function createScrollToTopClientTool(scroll: (top: number) => void = () => {
	scrollAppShellContent(0);
}) {
	return scrollToTopDef.client(() => {
		scroll(0);
		return { scrolled: true };
	});
}