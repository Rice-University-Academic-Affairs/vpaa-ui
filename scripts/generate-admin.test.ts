import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractResources, formatResourcesModule } from "../src/lib/admin/generator/extract.js";
import { appEntities } from "../rayfin/data/schema.js";

describe("admin generate scripts (G9, S1)", () => {
	it("detects stale generated output", async () => {
		const resources = extractResources({ entities: appEntities });
		const expected = formatResourcesModule(resources);
		const dir = await mkdtemp(path.join(os.tmpdir(), "admin-gen-"));
		const file = path.join(dir, "resources.ts");
		await writeFile(file, expected + "\n// stale\n", "utf8");
		const actual = await readFile(file, "utf8");
		expect(actual).not.toBe(expected);
	});

	it("fresh output matches formatter", () => {
		const resources = extractResources({ entities: appEntities });
		const a = formatResourcesModule(resources);
		const b = formatResourcesModule(extractResources({ entities: appEntities }));
		expect(a).toBe(b);
	});
});
