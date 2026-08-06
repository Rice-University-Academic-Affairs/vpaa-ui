import { describe, expect, it } from "vitest";
import { enrichDepartments, enrichSchools } from "./derive-drilldown-rows.js";

const schools = [{ school: "School of Engineering" }, { school: "School of Natural Sciences" }];
const departments = [
	{ school: "School of Engineering", department: "Computer Science" },
	{ school: "School of Engineering", department: "Physics" },
	{ school: "School of Natural Sciences", department: "Biology" }
];
const faculty = [
	{ school: "School of Engineering", department: "Computer Science", name: "A" },
	{ school: "School of Engineering", department: "Computer Science", name: "B" },
	{ school: "School of Engineering", department: "Physics", name: "C" },
	{ school: "School of Natural Sciences", department: "Biology", name: "D" }
];

describe("derive-drilldown-rows", () => {
	it("enriches schools with department and faculty counts", () => {
		expect(enrichSchools(schools, departments, faculty)).toEqual([
			{ school: "School of Engineering", deptCount: 2, facultyCount: 3 },
			{ school: "School of Natural Sciences", deptCount: 1, facultyCount: 1 }
		]);
	});

	it("enriches departments with faculty counts scoped to a school", () => {
		expect(enrichDepartments(departments, faculty, "School of Engineering")).toEqual([
			{ school: "School of Engineering", department: "Computer Science", facultyCount: 2 },
			{ school: "School of Engineering", department: "Physics", facultyCount: 1 }
		]);
	});
});
