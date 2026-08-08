import { AdminUser } from "./core/AdminUser.js";
import { Faculty } from "./showcase/Faculty.js";
import { FacultyAward } from "./showcase/FacultyAward.js";
import { Product } from "./showcase/Product.js";
import { ProductCategory } from "./showcase/ProductCategory.js";
import { ResearchGrant } from "./showcase/ResearchGrant.js";
import { SabbaticalCredit } from "./showcase/SabbaticalCredit.js";

export type AppSchema = {
	AdminUser: AdminUser;
	Faculty: Faculty;
	FacultyAward: FacultyAward;
	Product: Product;
	ProductCategory: ProductCategory;
	ResearchGrant: ResearchGrant;
	SabbaticalCredit: SabbaticalCredit;
};

export const coreEntities = [AdminUser] as const;

export const showcaseEntities = [
	Product,
	ProductCategory,
	Faculty,
	FacultyAward,
	ResearchGrant,
	SabbaticalCredit
] as const;

export const schema = [...coreEntities, ...showcaseEntities] as const;

/** @deprecated Prefer `schema` (Rayfin template name). */
export const appEntities = schema;
