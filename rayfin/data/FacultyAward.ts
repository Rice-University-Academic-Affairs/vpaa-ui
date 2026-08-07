import {
	authenticated,
	boolean,
	date,
	entity,
	set,
	text,
	uuid
} from "@microsoft/rayfin-core";

@entity()
@authenticated("*")
export class FacultyAward {
	@uuid()
	id!: string;

	@text({ max: 200 })
	title!: string;

	@text({ max: 100 })
	facultyId!: string;

	@set("nominated", "awarded", "declined")
	status!: "nominated" | "awarded" | "declined";

	@boolean()
	published!: boolean;

	@date()
	createdAt!: Date;

	@date({ optional: true })
	updatedAt?: Date;

	@text({ optional: true, max: 4000 })
	notes?: string;
}
