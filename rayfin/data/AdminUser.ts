import { authenticated, date, entity, text, uuid } from "@microsoft/rayfin-core";

@entity()
@authenticated("read")
export class AdminUser {
	@uuid()
	id!: string;

	@text({ optional: true, max: 200 })
	userId?: string;

	@text({ unique: true, max: 320 })
	email!: string;

	@date()
	createdAt!: Date;

	@text({ max: 320 })
	createdBy!: string;
}
