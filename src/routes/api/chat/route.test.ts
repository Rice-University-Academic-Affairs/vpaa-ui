import { describe, expect, it } from "vitest";
import { POST } from "./+server.js";

describe("chat route", () => {
	it("exports a POST handler", () => {
		expect(POST).toBeTypeOf("function");
	});
});
