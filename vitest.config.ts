import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/lib/ai-chat/**/*.{test,spec}.ts"],
		environment: "node"
	}
});
