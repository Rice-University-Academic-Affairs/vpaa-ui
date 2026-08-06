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
		environment: "jsdom",
		setupFiles: ["src/lib/ai-chat/test-utils/setup.ts"]
	}
});
