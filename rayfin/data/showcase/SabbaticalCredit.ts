import { authenticated, entity, int, one, text, uuid } from "@microsoft/rayfin-core";
import { Faculty } from "./Faculty.js";

@entity()
@authenticated("*")
export class SabbaticalCredit {
	@uuid()
	id!: string;

	@uuid()
	facultyId!: string;

	@one(() => Faculty)
	faculty!: Faculty;

	@uuid({ optional: true })
	sharedWithFacultyId?: string;

	@one(() => Faculty, { optional: true })
	sharedWithFaculty?: Faculty;

	@int()
	year!: number;

	@text({ optional: true, max: 500 })
	notes?: string;
}
