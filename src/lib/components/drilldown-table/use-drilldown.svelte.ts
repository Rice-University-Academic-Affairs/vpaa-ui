import type {
	DepartmentRow,
	DrilldownLevel,
	DrilldownPath,
	DrilldownView,
	FacultyRow
} from "$lib/types/drilldown.js";

export function useDrilldown(
	getDepartmentRows: () => DepartmentRow[],
	getFacultyRows: () => FacultyRow[]
) {
	let school = $state<string | null>(null);
	let department = $state<string | null>(null);
	let view = $state<DrilldownView>("by-dept");

	const level = $derived<DrilldownLevel>(
		department ? "faculty-in-dept" : view === "all-faculty" ? "all-faculty" : school ? "departments" : "schools"
	);

	const path = $derived<DrilldownPath>({
		...(school ? { school } : {}),
		...(department ? { department } : {}),
		...(!department ? { view } : {})
	});

	function deptsOfSchool(s: string) {
		return getDepartmentRows().filter((d) => d.school === s);
	}

	function facultyOfDept(s: string, d: string) {
		return getFacultyRows().filter((f) => f.school === s && f.department === d);
	}

	function facultyOfSchool(s: string) {
		return getFacultyRows().filter((f) => f.school === s);
	}

	function allFaculty() {
		return getFacultyRows();
	}

	function openSchool(s: string) {
		school = s;
		department = null;
		view = "by-dept";
	}

	function openDept(d: string) {
		department = d;
	}

	function toSchools() {
		school = null;
		department = null;
		view = "by-dept";
	}

	function toDepartments() {
		department = null;
		view = "by-dept";
	}

	function setView(next: DrilldownView) {
		view = next;
	}

	return {
		get school() {
			return school;
		},
		get department() {
			return department;
		},
		get view() {
			return view;
		},
		get level() {
			return level;
		},
		get path() {
			return path;
		},
		deptsOfSchool,
		facultyOfDept,
		facultyOfSchool,
		allFaculty,
		openSchool,
		openDept,
		toSchools,
		toDepartments,
		setView
	};
}

export type DrilldownState = ReturnType<typeof useDrilldown>;
