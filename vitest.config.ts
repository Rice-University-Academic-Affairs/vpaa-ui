import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		conditions: ["browser"]
	},
	test: {
		include: [
			"src/lib/ai-chat/**/*.{test,spec}.ts",
			"src/routes/api/chat/**/*.{test,spec}.ts"
		],
		coverage: {
			provider: "v8",
			include: [
				"src/lib/ai-chat/**/*.ts",
				"src/routes/api/chat/**/*.ts"
			],
			exclude: [
				"src/lib/ai-chat/**/*.test.ts",
				"src/lib/ai-chat/test-utils/**",
				"src/lib/ai-chat/e2e/**",
				"src/routes/api/chat/**/*.test.ts"
			],
			thresholds: {
				statements: 80,
				branches: 70,
				functions: 80,
				lines: 80
			}
		},
		environment: "jsdom",
		setupFiles: ["src/lib/ai-chat/test-utils/setup.ts"]
	}
});
