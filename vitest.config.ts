import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		conditions: ["browser"]
	},
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}", "scripts/**/*.{test,spec}.{js,ts}"],
		coverage: {
			provider: "v8",
			include: [
				"src/lib/ai-chat/**/*.ts",
				"src/routes/api/chat/**/*.ts",
				"src/lib/admin/**/*.ts"
			],
			exclude: [
				"src/lib/ai-chat/**/*.test.ts",
				"src/lib/ai-chat/test-utils/**",
				"src/lib/ai-chat/e2e/**",
				"src/routes/api/chat/**/*.test.ts",
				"src/lib/admin/**/*.test.ts",
				"src/lib/admin/generated/**",
				"src/lib/admin/test/**",
				"src/lib/admin/components/**"
			],
			thresholds: {
				statements: 80,
				branches: 70,
				functions: 80,
				lines: 80
			}
		},
		environment: "jsdom",
		setupFiles: ["src/test/setup.ts"]
	}
});
