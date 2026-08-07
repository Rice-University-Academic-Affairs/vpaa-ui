import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/lib/admin/rayfin.integration.test.ts"],
		passWithNoTests: true,
		environment: "node"
	}
});
