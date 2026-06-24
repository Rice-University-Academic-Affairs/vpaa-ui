import type {
	DepartmentDisplayRow,
	DepartmentRow,
	FacultyRow,
	SchoolDisplayRow,
	SchoolRow
} from "$lib/types/drilldown.js";

export function enrichSchools<T extends SchoolRow>(
	schools: T[],
	departments: DepartmentRow[],
	faculty: FacultyRow[]
): SchoolDisplayRow<T>[] {
	return schools.map((school) => {
		const schoolName = school.school;
		const depts = departments.filter((d) => d.school === schoolName);
		const facultyInSchool = faculty.filter((f) => f.school === schoolName);
		return {
			...school,
			deptCount: depts.length,
			facultyCount: facultyInSchool.length
		};
	});
}

export function enrichDepartments<T extends DepartmentRow>(
	departments: T[],
	faculty: FacultyRow[],
	school?: string
): DepartmentDisplayRow<T>[] {
	const scoped = school ? departments.filter((d) => d.school === school) : departments;
	return scoped.map((dept) => {
		const facultyInDept = faculty.filter(
			(f) => f.school === dept.school && f.department === dept.department
		);
		return {
			...dept,
			facultyCount: facultyInDept.length
		};
	});
}
