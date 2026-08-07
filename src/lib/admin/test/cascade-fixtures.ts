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
				childResource: "ResearchGrant",
				foreignKey: "facultyId",
				policy: "restrict"
			},
			{
				childResource: "SabbaticalCredit",
				foreignKey: "facultyId",
				policy: "cascade",
				parentField: "sabbaticalCredits"
			},
			{
				childResource: "SabbaticalCredit",
				foreignKey: "sharedWithFacultyId",
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
			{ name: "userId", type: "string", nullable: true, readOnly: false, generated: false },
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
	},
	DiamondRoot: {
		name: "DiamondRoot",
		slug: "diamond-roots",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "name", type: "string", nullable: false, readOnly: false, generated: false }
		],
		children: [
			{
				childResource: "DiamondLeft",
				foreignKey: "rootId",
				policy: "cascade",
				parentField: "lefts"
			},
			{
				childResource: "DiamondRight",
				foreignKey: "rootId",
				policy: "cascade",
				parentField: "rights"
			}
		]
	},
	DiamondLeft: {
		name: "DiamondLeft",
		slug: "diamond-lefts",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "rootId", type: "string", nullable: false, readOnly: false, generated: false }
		],
		children: [
			{
				childResource: "DiamondLeaf",
				foreignKey: "leftId",
				policy: "cascade",
				parentField: "leaves"
			}
		]
	},
	DiamondRight: {
		name: "DiamondRight",
		slug: "diamond-rights",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "rootId", type: "string", nullable: false, readOnly: false, generated: false }
		],
		children: [
			{
				childResource: "DiamondLeaf",
				foreignKey: "rightId",
				policy: "cascade",
				parentField: "leaves"
			}
		]
	},
	DiamondLeaf: {
		name: "DiamondLeaf",
		slug: "diamond-leaves",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "leftId", type: "string", nullable: true, readOnly: false, generated: false },
			{ name: "rightId", type: "string", nullable: true, readOnly: false, generated: false }
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
