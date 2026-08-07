import { describe, expect, it } from "vitest";
import { mapAdminError } from "./errors.js";
import { AdminError } from "./types.js";

describe("errors", () => {
	it("maps AdminError kinds to safe UI states (E1)", () => {
		expect(mapAdminError(new AdminError("validation", "Bad", { fields: { name: "Required" } }))).toMatchObject({
			kind: "validation",
			fields: { name: "Required" }
		});
		expect(mapAdminError(new AdminError("forbidden", "Nope"))).toMatchObject({ kind: "forbidden" });
		expect(mapAdminError(new AdminError("unexpected", "secret internals"))).toMatchObject({
			kind: "unexpected",
			message: "Something went wrong. Please try again."
		});
	});

	it("maps SDK-shaped GraphQL errors without requiring a status field", () => {
		expect(mapAdminError(new Error("GraphQL errors: permission denied"))).toMatchObject({
			kind: "forbidden"
		});
		expect(mapAdminError(new Error("GraphQL errors: validation failed"))).toMatchObject({
			kind: "validation"
		});
		expect(mapAdminError(new Error("GraphQL errors: internal boom"))).toMatchObject({
			kind: "unexpected"
		});
		expect(mapAdminError({ status: 403, message: "denied" })).toMatchObject({ kind: "forbidden" });
		expect(mapAdminError({ status: 409, message: "dup" })).toMatchObject({ kind: "conflict" });
		expect(mapAdminError(new AdminError("not_found", "gone"))).toMatchObject({ kind: "not_found" });
	});
});
