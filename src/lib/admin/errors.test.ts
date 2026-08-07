import { describe, expect, it } from "vitest";
import { mapAdminError } from "./errors.js";
import { AdminError } from "./types.js";

describe("errors", () => {
	it("maps Rayfin-style errors to safe UI states (E1)", () => {
		expect(mapAdminError(new AdminError("validation", "Bad", { fields: { name: "Required" } }))).toMatchObject({
			kind: "validation",
			fields: { name: "Required" }
		});
		expect(mapAdminError(new AdminError("forbidden", "Nope"))).toMatchObject({ kind: "forbidden" });
		expect(mapAdminError({ status: 403, message: "denied" })).toMatchObject({ kind: "forbidden" });
		expect(mapAdminError(new Error("boom"))).toMatchObject({ kind: "unexpected" });
	});
});
