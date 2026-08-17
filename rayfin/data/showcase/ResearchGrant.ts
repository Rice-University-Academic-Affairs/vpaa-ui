import { authenticated, entity, one, text, uuid } from "@microsoft/rayfin-core";
import { Faculty } from "./Faculty.js";

@entity()
@authenticated("*")
export class ResearchGrant {
	@uuid()
	id!: string;

	@text({ max: 200 })
	title!: string;

	@uuid()
	facultyId!: string;

	@one(() => Faculty)
	faculty!: Faculty;
}
