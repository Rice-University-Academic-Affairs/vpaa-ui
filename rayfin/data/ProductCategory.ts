import { authenticated, entity, text, uuid, one } from "@microsoft/rayfin-core";
import { Product } from "./Product.js";

@entity()
@authenticated("*")
export class ProductCategory {
	@uuid()
	id!: string;

	@text({ max: 200 })
	name!: string;

	@uuid()
	productId!: string;

	@one(() => Product)
	product!: Product;
}
