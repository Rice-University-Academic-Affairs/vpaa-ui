import type { DepartmentRow, SchoolRow } from "$lib/types/drilldown.js";

export type ShowcaseFacultyRow = {
	school: string;
	name: string;
	department: string;
	status: "tenured" | "tenure-track" | "pending";
	fte: number;
};

export type ShowcaseSchoolRow = SchoolRow & { dean: string };

export type ShowcaseDepartmentRow = DepartmentRow & { chair: string };

const schoolDeans: Record<string, string> = {
	"School of Engineering": "Dr. Helen Cho",
	"School of Natural Sciences": "Dr. Marcus Webb",
	"School of Social Sciences": "Dr. Yuki Tanaka"
};

const departmentChairs: Record<string, string> = {
	"Computer Science": "Dr. Elena Martinez",
	"Electrical Engineering": "Dr. James Chen",
	Bioengineering: "Dr. Sarah Williams",
	Physics: "Dr. Michael Okonkwo",
	Mathematics: "Dr. Priya Sharma",
	"Chemical Engineering": "Dr. Robert Kim",
	"Mechanical Engineering": "Dr. Anna Bergström",
	Statistics: "Dr. David Okafor",
	Neuroscience: "Dr. Lisa Thompson",
	Economics: "Dr. Carlos Mendez",
	"Political Science": "Dr. Emily Foster",
	Architecture: "Dr. Raj Patel"
};

export const faculty: ShowcaseFacultyRow[] = [
	{ name: "Dr. Elena Martinez", department: "Computer Science", school: "School of Engineering", status: "tenured", fte: 1.0 },
	{ name: "Dr. James Chen", department: "Electrical Engineering", school: "School of Engineering", status: "tenured", fte: 1.0 },
	{ name: "Dr. Sarah Williams", department: "Bioengineering", school: "School of Engineering", status: "tenure-track", fte: 1.0 },
	{ name: "Dr. Michael Okonkwo", department: "Physics", school: "School of Natural Sciences", status: "tenured", fte: 0.75 },
	{ name: "Dr. Priya Sharma", department: "Mathematics", school: "School of Natural Sciences", status: "tenure-track", fte: 1.0 },
	{ name: "Dr. Robert Kim", department: "Chemical Engineering", school: "School of Engineering", status: "pending", fte: 1.0 },
	{ name: "Dr. Anna Bergström", department: "Mechanical Engineering", school: "School of Engineering", status: "tenured", fte: 1.0 },
	{ name: "Dr. David Okafor", department: "Statistics", school: "School of Natural Sciences", status: "tenure-track", fte: 0.5 },
	{ name: "Dr. Lisa Thompson", department: "Neuroscience", school: "School of Natural Sciences", status: "tenured", fte: 1.0 },
	{ name: "Dr. Carlos Mendez", department: "Economics", school: "School of Social Sciences", status: "pending", fte: 1.0 },
	{ name: "Dr. Emily Foster", department: "Political Science", school: "School of Social Sciences", status: "tenured", fte: 0.67 },
	{ name: "Dr. Raj Patel", department: "Architecture", school: "School of Engineering", status: "tenure-track", fte: 1.0 }
];

export const schools: ShowcaseSchoolRow[] = [...new Set(faculty.map((row) => row.school))]
	.sort()
	.map((school) => ({ school, dean: schoolDeans[school] ?? "—" }));

export const departments: ShowcaseDepartmentRow[] = [
	...new Map(
		faculty.map((row) => [
			`${row.school}\0${row.department}`,
			{
				school: row.school,
				department: row.department,
				chair: departmentChairs[row.department] ?? "—"
			}
		])
	).values()
].sort((a, b) => a.department.localeCompare(b.department));
