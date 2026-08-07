import { describe, expect, it } from "vitest";
import { faculty as showcaseFaculty } from "../routes/showcase.js";
import { facultyData } from "./table-fixtures.js";

describe("showcase table fixtures", () => {
	it("keeps unit test faculty data aligned with the showcase page", () => {
		const showcaseNames = showcaseFaculty.map((row) => row.name).sort();
		const fixtureNames = facultyData.map((row) => row.name).sort();

		expect(fixtureNames).toEqual(showcaseNames);
		expect(showcaseFaculty).toHaveLength(12);
	});
});
