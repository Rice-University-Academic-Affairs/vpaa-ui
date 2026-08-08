import { authenticated, entity, many, text, uuid } from "@microsoft/rayfin-core";
import { SabbaticalCredit } from "./SabbaticalCredit.js";

@entity()
@authenticated("*")
export class Faculty {
	@uuid()
	id!: string;

	@text({ max: 200 })
	name!: string;

	@many(() => SabbaticalCredit)
	sabbaticalCredits!: SabbaticalCredit[];
}
