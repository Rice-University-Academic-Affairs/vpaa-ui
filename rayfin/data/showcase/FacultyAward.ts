import {
	authenticated,
	boolean,
	date,
	entity,
	one,
	set,
	text,
	uuid
} from "@microsoft/rayfin-core";
import { Faculty } from "./Faculty.js";

@entity()
@authenticated("*")
export class FacultyAward {
	@uuid()
	id!: string;

	@text({ max: 200 })
	title!: string;

	@uuid()
	facultyId!: string;

	@one(() => Faculty)
	faculty!: Faculty;

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
