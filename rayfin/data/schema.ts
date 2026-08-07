import { AdminUser } from "./AdminUser.js";
import { Faculty } from "./Faculty.js";
import { FacultyAward } from "./FacultyAward.js";
import { Product } from "./Product.js";
import { ResearchGrant } from "./ResearchGrant.js";
import { SabbaticalCredit } from "./SabbaticalCredit.js";

export type AppSchema = {
	AdminUser: AdminUser;
	Faculty: Faculty;
	FacultyAward: FacultyAward;
	Product: Product;
	ResearchGrant: ResearchGrant;
	SabbaticalCredit: SabbaticalCredit;
};

export const appEntities = [
	AdminUser,
	Faculty,
	FacultyAward,
	Product,
	ResearchGrant,
	SabbaticalCredit
] as const;
