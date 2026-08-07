import { describe, expect, it } from "vitest";
import { buildPrimaryNavigation } from "./navigation.js";

describe("buildPrimaryNavigation (N1-N2)", () => {
	it("omits Admin when the caller is not an admin", () => {
		const nav = buildPrimaryNavigation({ isAdmin: false });
		const labels = nav[0]!.items.map((item) => item.label);
		expect(labels).toEqual(["Showcase"]);
		expect(labels).not.toContain("Admin");
	});

	it("includes Admin only when isAdmin is true", () => {
		const nav = buildPrimaryNavigation({ isAdmin: true });
		const labels = nav[0]!.items.map((item) => item.label);
		expect(labels).toEqual(["Showcase", "Admin"]);
		expect(nav[0]!.items.find((item) => item.label === "Admin")?.href).toBe("/admin");
	});
});
