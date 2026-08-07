import { describe, expect, it } from "vitest";
import { getDemoStatsDef, serverTools } from "./tools.js";

describe("chat demo tools", () => {
	it("defines the demo stats tool metadata", () => {
		expect(getDemoStatsDef.name).toBe("get_demo_stats");
		expect(getDemoStatsDef.description).toContain("faculty statistics");
	});

	it("returns demo faculty statistics from the server tool", async () => {
		const execute = serverTools[0]?.execute;
		expect(execute).toBeTypeOf("function");

		const result = execute?.({});
		expect(result).toEqual({
			facultyCount: 1247,
			departmentCount: 42
		});
	});
});
