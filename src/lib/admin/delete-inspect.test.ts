import { describe, expect, it } from "vitest";
import { canConfirmAdminDelete, createDeleteInspectGate } from "./delete-inspect.js";

describe("delete inspect gate", () => {
	it("UI-CD stale inspect results are ignored after invalidate or newer begin", async () => {
		const gate = createDeleteInspectGate();
		const first = gate.begin();
		const second = gate.begin();
		expect(gate.isCurrent(first)).toBe(false);
		expect(gate.isCurrent(second)).toBe(true);

		let applied: string | null = null;
		const slow = Promise.resolve("stale-ok").then((value) => {
			if (gate.isCurrent(first)) applied = value;
		});
		const fast = Promise.resolve("fresh-block").then((value) => {
			if (gate.isCurrent(second)) applied = value;
		});
		await Promise.all([slow, fast]);
		expect(applied).toBe("fresh-block");

		gate.invalidate();
		expect(gate.isCurrent(second)).toBe(false);
	});

	it("UI-CD confirm stays disabled while inspecting or when blocked", () => {
		expect(canConfirmAdminDelete(true, null)).toBe(false);
		expect(canConfirmAdminDelete(false, null)).toBe(true);
		expect(canConfirmAdminDelete(false, { canDelete: true })).toBe(true);
		expect(canConfirmAdminDelete(false, { canDelete: false })).toBe(false);
		expect(canConfirmAdminDelete(true, { canDelete: true })).toBe(false);
	});
});
