import { toolDefinition } from "@tanstack/ai";

export const getDemoStatsDef = toolDefinition({
	name: "get_demo_stats",
	description: "Return demo faculty statistics for the showcase",
	inputSchema: {
		type: "object",
		properties: {},
		additionalProperties: false
	},
	outputSchema: {
		type: "object",
		properties: {
			facultyCount: { type: "number" },
			departmentCount: { type: "number" }
		},
		required: ["facultyCount", "departmentCount"],
		additionalProperties: false
	}
});

export const serverTools = [
	getDemoStatsDef.server(() => ({
		facultyCount: 1247,
		departmentCount: 42
	}))
];
