import type {
	AdminChildRelation,
	AdminDeleteImpact,
	AdminDeletePolicy,
	AdminResources
} from "./types.js";

export const cascadeFixtureResources: AdminResources = {
	Faculty: {
		name: "Faculty",
		slug: "faculties",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "name", type: "string", nullable: false, readOnly: false, generated: false }
		],
		children: [
			{
				childResource: "SabbaticalCredit",
				foreignKey: "facultyId",
				policy: "cascade",
				parentField: "sabbaticalCredits"
			},
			{
				childResource: "ResearchGrant",
				foreignKey: "facultyId",
				policy: "restrict"
			}
		]
	},
	SabbaticalCredit: {
		name: "SabbaticalCredit",
		slug: "sabbatical-credits",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "facultyId", type: "string", nullable: false, readOnly: false, generated: false },
			{ name: "sharedWithFacultyId", type: "string", nullable: true, readOnly: false, generated: false },
			{ name: "year", type: "integer", nullable: false, readOnly: false, generated: false }
		],
		children: []
	},
	ResearchGrant: {
		name: "ResearchGrant",
		slug: "research-grants",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "facultyId", type: "string", nullable: false, readOnly: false, generated: false },
			{ name: "title", type: "string", nullable: false, readOnly: false, generated: false }
		],
		children: []
	},
	Department: {
		name: "Department",
		slug: "departments",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "name", type: "string", nullable: false, readOnly: false, generated: false }
		],
		children: [
			{
				childResource: "CourseSection",
				foreignKey: "departmentId",
				policy: "cascade",
				parentField: "sections"
			}
		]
	},
	CourseSection: {
		name: "CourseSection",
		slug: "course-sections",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "departmentId", type: "string", nullable: false, readOnly: false, generated: false },
			{ name: "code", type: "string", nullable: false, readOnly: false, generated: false }
		],
		children: [
			{
				childResource: "Enrollment",
				foreignKey: "sectionId",
				policy: "cascade",
				parentField: "enrollments"
			}
		]
	},
	Enrollment: {
		name: "Enrollment",
		slug: "enrollments",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "sectionId", type: "string", nullable: false, readOnly: false, generated: false },
			{ name: "studentName", type: "string", nullable: false, readOnly: false, generated: false }
		],
		children: []
	}
};

export function emptyImpact(
	resource: string,
	id: string,
	overrides: Partial<AdminDeleteImpact> = {}
): AdminDeleteImpact {
	return {
		resource,
		id,
		blocking: [],
		cascading: [],
		canDelete: true,
		...overrides
	};
}

export function relation(
	partial: Omit<AdminChildRelation, "policy"> & { policy?: AdminDeletePolicy }
): AdminChildRelation {
	return { policy: "cascade", ...partial };
}
