import type { Column } from "$lib/types/data-table.js";

export type FacultyRow = {
	name: string;
	department: string;
	status: "tenured" | "tenure-track" | "pending";
	fte: number;
};

export const facultyColumns: Column[] = [
	{ field: "name", style: "title", searchable: true, sortable: true },
	{ field: "department", searchable: true, filterable: true },
	{
		field: "status",
		style: "tag",
		filterable: true,
		labels: { tenured: "Tenured", "tenure-track": "T-track", pending: "Pending" }
	},
	{ field: "fte", style: "metric", sortable: true }
];

export const facultyData: FacultyRow[] = [
	{ name: "Dr. Elena Martinez", department: "Computer Science", status: "tenured", fte: 1.0 },
	{ name: "Dr. James Chen", department: "Electrical Engineering", status: "tenured", fte: 1.0 },
	{ name: "Dr. Sarah Williams", department: "Bioengineering", status: "tenure-track", fte: 1.0 },
	{ name: "Dr. Michael Okonkwo", department: "Physics", status: "tenured", fte: 0.75 },
	{ name: "Dr. Priya Sharma", department: "Mathematics", status: "tenure-track", fte: 1.0 },
	{ name: "Dr. Robert Kim", department: "Chemical Engineering", status: "pending", fte: 1.0 },
	{ name: "Dr. Anna Bergström", department: "Mechanical Engineering", status: "tenured", fte: 1.0 },
	{ name: "Dr. David Okafor", department: "Statistics", status: "tenure-track", fte: 0.5 },
	{ name: "Dr. Lisa Thompson", department: "Neuroscience", status: "tenured", fte: 1.0 },
	{ name: "Dr. Carlos Mendez", department: "Economics", status: "pending", fte: 1.0 },
	{ name: "Dr. Emily Foster", department: "Political Science", status: "tenured", fte: 0.67 },
	{ name: "Dr. Raj Patel", department: "Architecture", status: "tenure-track", fte: 1.0 }
];
