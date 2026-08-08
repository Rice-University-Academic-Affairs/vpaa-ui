import { authenticated, entity, int, text, uuid } from "@microsoft/rayfin-core";

@entity()
@authenticated("*")
export class Product {
	@uuid()
	id!: string;

	@text({ max: 200 })
	name!: string;

	@text({ optional: true, max: 4000 })
	description?: string;

	@int()
	priceInCents!: number;
}
