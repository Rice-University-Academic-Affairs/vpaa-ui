import { AdminUser } from "./AdminUser.js";
import { FacultyAward } from "./FacultyAward.js";
import { Product } from "./Product.js";

export type AppSchema = {
	AdminUser: AdminUser;
	FacultyAward: FacultyAward;
	Product: Product;
};

export const appEntities = [AdminUser, FacultyAward, Product] as const;
