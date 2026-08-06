import { toolDefinition } from "@tanstack/ai";

export const setFlagDef = toolDefinition({
	name: "set_flag",
	description: "Set a test flag value in the browser",
	inputSchema: {
		type: "object",
		properties: {
			value: { type: "string" }
		},
		required: ["value"],
		additionalProperties: false
	},
	outputSchema: {
		type: "object",
		properties: {
			ok: { type: "boolean" }
		},
		required: ["ok"],
		additionalProperties: false
	}
});

export function createSetFlagClientTool(onExecute: (value: string) => void) {
	return setFlagDef.client((input) => {
		onExecute((input as { value: string }).value);
		return { ok: true };
	});
}
