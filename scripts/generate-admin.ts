import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appEntities } from "../rayfin/data/schema.js";
import { extractResources, formatResourcesModule } from "../src/lib/admin/generator/extract.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(root, "src/lib/admin/generated/resources.ts");

export async function generateAdminResources(): Promise<string> {
	const resources = extractResources({ entities: appEntities });
	const source = formatResourcesModule(resources);
	await mkdir(path.dirname(outFile), { recursive: true });
	await writeFile(outFile, source, "utf8");
	return source;
}

export async function checkAdminResources(options?: { outFile?: string }): Promise<void> {
	const target = options?.outFile ?? outFile;
	const resources = extractResources({ entities: appEntities });
	const expected = formatResourcesModule(resources);
	let actual = "";
	try {
		actual = await readFile(target, "utf8");
	} catch {
		throw new Error(`Generated admin resources missing at ${target}. Run npm run admin:generate.`);
	}
	if (actual !== expected) {
		throw new Error("Generated admin resources are stale. Run npm run admin:generate.");
	}
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	const mode = process.argv[2] ?? "generate";
	if (mode === "check") {
		await checkAdminResources();
		console.log("admin:check ok");
	} else {
		await generateAdminResources();
		console.log(`Wrote ${path.relative(root, outFile)}`);
	}
}
