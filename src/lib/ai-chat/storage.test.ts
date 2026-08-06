import { describe, expect, it } from "vitest";
import { createMemoryThreadStorage } from "./storage.js";

describe("createMemoryThreadStorage", () => {
	it("creates and lists threads", async () => {
		const storage = createMemoryThreadStorage();
		const thread = await storage.createThread({ title: "Budget review" });

		const threads = await storage.listThreads();
		expect(threads).toHaveLength(1);
		expect(threads[0]?.id).toBe(thread.id);
		expect(threads[0]?.title).toBe("Budget review");
	});

	it("updates and deletes threads", async () => {
		const storage = createMemoryThreadStorage();
		const thread = await storage.createThread({ title: "Draft" });

		await storage.updateThread(thread.id, {
			title: "Final",
			preview: "Looks good"
		});

		expect(await storage.getThread(thread.id)).toMatchObject({
			title: "Final",
			preview: "Looks good"
		});

		await storage.deleteThread(thread.id);
		expect(await storage.getThread(thread.id)).toBeNull();
	});
});
