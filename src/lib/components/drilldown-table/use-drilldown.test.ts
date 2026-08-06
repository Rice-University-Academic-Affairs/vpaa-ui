import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { DrilldownState } from "./use-drilldown.svelte.js";
import DrilldownHarness from "./DrilldownHarness.svelte";

const departments = [
	{ school: "School of Engineering", department: "Computer Science" },
	{ school: "School of Engineering", department: "Physics" }
];
const faculty = [
	{ school: "School of Engineering", department: "Computer Science", name: "A" },
	{ school: "School of Engineering", department: "Physics", name: "B" }
];

describe("useDrilldown", () => {
	it("navigates schools, departments, and faculty levels", async () => {
		let drilldown: DrilldownState | undefined;

		render(DrilldownHarness, {
			props: {
				departments,
				faculty,
				onState: (state) => {
					drilldown = state;
				}
			}
		});

		expect(drilldown?.level).toBe("schools");

		drilldown?.openSchool("School of Engineering");
		expect(drilldown?.level).toBe("departments");
		expect(drilldown?.path).toEqual({ school: "School of Engineering", view: "by-dept" });

		drilldown?.openDept("Computer Science");
		expect(drilldown?.level).toBe("faculty-in-dept");
		expect(drilldown?.facultyOfDept("School of Engineering", "Computer Science")).toHaveLength(1);

		drilldown?.toDepartments();
		expect(drilldown?.level).toBe("departments");

		drilldown?.setView("all-faculty");
		expect(drilldown?.level).toBe("all-faculty");
		expect(drilldown?.allFaculty()).toHaveLength(2);

		drilldown?.toSchools();
		expect(drilldown?.level).toBe("schools");
	});
});
