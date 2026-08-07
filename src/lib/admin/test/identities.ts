import { DEFAULT_OWNER_ADMIN_EMAIL } from "../owner-config.js";
import type { AdminIdentity } from "../types.js";

export const TEST_OWNER: AdminIdentity = {
	userId: "user-owner",
	email: DEFAULT_OWNER_ADMIN_EMAIL
};

export const TEST_ADMIN: AdminIdentity = {
	userId: "user-admin",
	email: "admin@example.edu"
};

export const TEST_INVITEE: AdminIdentity = {
	userId: "user-invitee",
	email: "invitee@example.edu"
};

export const TEST_NON_ADMIN: AdminIdentity = {
	userId: "user-guest",
	email: "guest@example.edu"
};

export function createProductSeed(count: number) {
	return Array.from({ length: count }, (_, i) => ({
		id: `product-${String(i + 1).padStart(3, "0")}`,
		name: `Product ${String(i + 1).padStart(3, "0")}`,
		description: i % 2 === 0 ? `Description ${i + 1}` : null,
		priceInCents: (i + 1) * 100
	}));
}
