export type SchoolRow = { school: string } & Record<string, unknown>;

export type DepartmentRow = { school: string; department: string } & Record<string, unknown>;

export type FacultyRow = { school: string; department: string } & Record<string, unknown>;

export type DerivedSchoolMeta = {
	deptCount: number;
	facultyCount: number;
};

export type DerivedDeptMeta = {
	facultyCount: number;
};

export type SchoolDisplayRow<T extends SchoolRow = SchoolRow> = T & DerivedSchoolMeta;

export type DepartmentDisplayRow<T extends DepartmentRow = DepartmentRow> = T & DerivedDeptMeta;

export type DrilldownView = "by-dept" | "all-faculty";

export type DrilldownPath = {
	school?: string;
	department?: string;
	view?: DrilldownView;
};

export type DrilldownLevel =
	| "schools"
	| "departments"
	| "all-faculty"
	| "faculty-in-dept";
